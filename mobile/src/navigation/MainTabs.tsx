import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import LibraryScreen from "../screens/LibraryScreen";
import MiniPlayer from "../components/MiniPlayer";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, any> = { Home: "home", Search: "search", Library: "albums" };
            return <Ionicons name={icons[route.name]} size={size + 1} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Library" component={LibraryScreen} />
      </Tab.Navigator>
      <View style={styles.miniPlayerWrapper}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    paddingBottom: 8,
    paddingTop: 7,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    elevation: 0,
  },
  tabItem: {
    borderRadius: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  miniPlayerWrapper: { position: "absolute", bottom: 72, left: 0, right: 0 },
});
