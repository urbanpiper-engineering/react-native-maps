import React from 'react';
import PropTypes from 'prop-types';
import { requireNativeComponent, NativeModules, Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from './ProviderConstants';

export const SUPPORTED = 'SUPPORTED';
export const USES_DEFAULT_IMPLEMENTATION = 'USES_DEFAULT_IMPLEMENTATION';
export const NOT_SUPPORTED = 'NOT_SUPPORTED';

// Create modern Context API
export const ProviderContext = React.createContext(PROVIDER_DEFAULT);

export function getAirMapName(provider) {
  if (Platform.OS === 'android') {
    return 'AIRMap';
  }
  if (provider === PROVIDER_GOOGLE) {
    return 'AIRGoogleMap';
  }
  return 'AIRMap';
}

function getAirComponentName(provider, component) {
  return `${getAirMapName(provider)}${component}`;
}

// Legacy contextTypes removed - now using ProviderContext

export const createNotSupportedComponent = message => () => {
  console.error(message);
  return null;
};

function getViewManagerConfig(viewManagerName) {
  const UIManager = NativeModules.UIManager;
  if (!UIManager.getViewManagerConfig) {
    // RN < 0.58
    return UIManager[viewManagerName];
  }
  // RN >= 0.58
  return UIManager.getViewManagerConfig(viewManagerName);
}

export const googleMapIsInstalled = !!getViewManagerConfig(
  getAirMapName(PROVIDER_GOOGLE)
);

export default function decorateMapComponent(
  Component,
  { componentType, providers }
) {
  const components = {};

  const getDefaultComponent = () =>
    requireNativeComponent(getAirComponentName(null, componentType), Component);

  // Wrap component to use Context.Consumer instead of legacy contextTypes
  class ContextWrappedComponent extends Component {
    render() {
      return (
        <ProviderContext.Consumer>
          {provider => {
            this._provider = provider || PROVIDER_DEFAULT;
            return super.render();
          }}
        </ProviderContext.Consumer>
      );
    }

    getAirComponent() {
      const provider = this._provider || PROVIDER_DEFAULT;
      if (components[provider]) {
        return components[provider];
      }

      if (provider === PROVIDER_DEFAULT) {
        components[PROVIDER_DEFAULT] = getDefaultComponent();
        return components[PROVIDER_DEFAULT];
      }

      const providerInfo = providers[provider];
      const platformSupport = providerInfo[Platform.OS];
      const componentName = getAirComponentName(provider, componentType);
      if (platformSupport === NOT_SUPPORTED) {
        components[provider] = createNotSupportedComponent(
          `react-native-maps: ${componentName} is not supported on ${Platform.OS}`
        );
      } else if (platformSupport === SUPPORTED) {
        if (
          provider !== PROVIDER_GOOGLE ||
          (Platform.OS === 'ios' && googleMapIsInstalled)
        ) {
          components[provider] = requireNativeComponent(componentName, Component);
        }
      } else {
        // (platformSupport === USES_DEFAULT_IMPLEMENTATION)
        if (!components[PROVIDER_DEFAULT]) {
          components[PROVIDER_DEFAULT] = getDefaultComponent();
        }
        components[provider] = components[PROVIDER_DEFAULT];
      }

      return components[provider];
    }

    getUIManagerCommand(name) {
      const componentName = getAirComponentName(
        this._provider || PROVIDER_DEFAULT,
        componentType
      );
      return getViewManagerConfig(componentName).Commands[name];
    }

    getMapManagerCommand(name) {
      const airComponentName = `${getAirComponentName(
        this._provider || PROVIDER_DEFAULT,
        componentType
      )}Manager`;
      return NativeModules[airComponentName][name];
    }
  }

  // Copy static properties
  ContextWrappedComponent.propTypes = Component.propTypes;
  ContextWrappedComponent.defaultProps = Component.defaultProps;
  ContextWrappedComponent.viewConfig = Component.viewConfig;
  
  return ContextWrappedComponent;
}
