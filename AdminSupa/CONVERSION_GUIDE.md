# TailwindCSS to StyleSheet Conversion Guide

## What was done:
1. ✅ Uninstalled nativewind and tailwindcss
2. ✅ Removed nativewind/babel from babel.config.js
3. ✅ Deleted tailwind.config.js
4. ✅ Converted DashboardScreen.js to use StyleSheet

## Remaining screens to convert:

The following screens still use `className` and need to be converted to `style={styles.X}`:

- UsersScreen.js
- ChannelsScreen.js  
- CarouselScreen.js
- NotificationsScreen.js
- SettingsScreen.js

## Quick conversion pattern:

Replace `className="..."` with `style={styles.X}` and add StyleSheet.create() at the bottom.

### Example conversion:
```javascript
// Before:
<View className="flex-1 bg-dark-bg">
  <Text className="text-white text-lg">Hello</Text>
</View>

// After:
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
  },
});
```

## Color Reference:
- bg-dark-bg: '#0f172a'
- bg-dark-card: '#1e293b'
- border-dark-border: '#334155'
- text-dark-text: '#e2e8f0'
- text-dark-muted: '#94a3b8'
- bg-primary-600: '#2563eb'
- text-white: '#ffffff'
