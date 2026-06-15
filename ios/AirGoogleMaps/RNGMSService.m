//
//  RNGMSService.m
//  react-native-google-maps
//

#ifdef HAVE_GOOGLE_MAPS

#import "RNGMSService.h"
#import <GoogleMaps/GoogleMaps.h>

@implementation RNGMSService
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(provideAPIKey: (NSString *)key) {
    [GMSServices provideAPIKey:key];
}

@end

#endif
