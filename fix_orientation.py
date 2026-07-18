import re
with open('src/components/FullscreenNavigator.tsx', 'r') as f:
    content = f.read()

replacement = """
  const startCompassListener = React.useCallback(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      let heading: number | null = null;
      
      // iOS
      if ('webkitCompassHeading' in event) {
        heading = (event as any).webkitCompassHeading;
      } else {
        // Fallback for Android deviceorientation if absolute is not supported?
        // But deviceorientation is relative on Android, so we shouldn't use it unless it's explicitly absolute.
        // If event.absolute is true, it's absolute, but some browsers don't set it.
        // Actually, let's just let deviceorientationabsolute handle Android.
        // Only use event.alpha here if we know it's absolute or it's our only option.
        // Wait, on Android, deviceorientationabsolute is what we want.
        return; 
      }

      if (heading !== null && heading !== undefined) {
        setDeviceHeading(Math.round(heading));
      }
    };

    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null && event.alpha !== undefined) {
        // Chrome Android absolute orientation
        // Wait, some devices have alpha increasing clockwise. But standard is CCW.
        // If standard is CCW, then East is 270. 360 - 270 = 90 (East).
        // Let's use standard.
        const heading = (360 - event.alpha) % 360;
        setDeviceHeading(Math.round(heading));
      }
    };

    // Listen to both for maximum cross-platform compatibility (especially Chrome on Android)
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as EventListener);
    }
    // Always add this for iOS webkitCompassHeading
    window.addEventListener('deviceorientation', handleOrientation as EventListener);

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as EventListener);
      }
      window.removeEventListener('deviceorientation', handleOrientation as EventListener);
    };
  }, []);
"""

# Let's replace the old startCompassListener
pattern = r"const startCompassListener = React\.useCallback\(\(\) => \{.*?\}, \[\]\);"
content = re.sub(pattern, replacement.strip(), content, flags=re.DOTALL)

with open('src/components/FullscreenNavigator.tsx', 'w') as f:
    f.write(content)
