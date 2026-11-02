import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { colors } from "./src/theme/colors";
import { PlayerProvider } from "./src/context/PlayerContext";
import { LibraryProvider } from "./src/context/LibraryContext";
import { TrackActionsProvider } from "./src/components/TrackActionsSheet";
import ErrorBoundary from "./src/components/ErrorBoundary";
import MainTabs from "./src/navigation/MainTabs";
import ArtistScreen from "./src/screens/ArtistScreen";
import NowPlayingScreen from "./src/screens/NowPlayingScreen";
import LikedSongsScreen from "./src/screens/LikedSongsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SettingDetailScreen from "./src/screens/SettingDetailScreen";
import RecentlyPlayedScreen from "./src/screens/RecentlyPlayedScreen";
import PlaylistsScreen from "./src/screens/PlaylistsScreen";
import PlaylistDetailsScreen from "./src/screens/PlaylistDetailsScreen";
import DownloadsScreen from "./src/screens/DownloadsScreen";
import LyricsScreen from "./src/screens/LyricsScreen";

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, primary: colors.primary },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <PlayerProvider>
            <LibraryProvider>
              <StatusBar style="light" />
              <NavigationContainer theme={navTheme}>
                <TrackActionsProvider>
                  <Stack.Navigator
                    screenOptions={{
                      headerShown: false,
                      animation: "slide_from_right",
                      animationDuration: 250,
                    }}
                  >
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                    <Stack.Screen name="Artist" component={ArtistScreen} options={{ headerShown: true, title: "" }} />
                    <Stack.Screen name="NowPlaying" component={NowPlayingScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
                    <Stack.Screen name="LikedSongs" component={LikedSongsScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen name="SettingDetail" component={SettingDetailScreen} />
                    <Stack.Screen name="RecentlyPlayed" component={RecentlyPlayedScreen} />
                    <Stack.Screen name="Playlists" component={PlaylistsScreen} />
                    <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
                    <Stack.Screen name="Downloads" component={DownloadsScreen} />
                    <Stack.Screen name="Lyrics" component={LyricsScreen} options={{ presentation: "modal" }} />
                  </Stack.Navigator>
                </TrackActionsProvider>
              </NavigationContainer>
            </LibraryProvider>
          </PlayerProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
