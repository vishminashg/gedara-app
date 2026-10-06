import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useWide } from './hooks';
import { useSession } from './session';
import { Loading } from './ui';
import { C, F } from './theme';

import { LoginScreen, RegisterScreen } from './screens/Auth';
import Notifications from './screens/Notifications';
import Home from './screens/customer/C1Home';
import Results from './screens/customer/C2Results';
import ProviderProfile from './screens/customer/C3Profile';
import Describe from './screens/customer/C4Describe';
import Time from './screens/customer/C5Time';
import Booking from './screens/customer/C6Booking';
import { Messages, Chat } from './screens/customer/C7Messages';
import Bookings from './screens/customer/C8Bookings';
import Rate from './screens/customer/C9Rate';
import Requests from './screens/provider/P1Requests';
import Request from './screens/provider/P2Request';
import Calendar from './screens/provider/P3Calendar';
import MyProfile from './screens/provider/P4Profile';
import History from './screens/provider/P5History';
import Dashboard from './screens/admin/A1Dashboard';
import Verification from './screens/admin/A2Verification';
import Complaints from './screens/admin/A3Complaints';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.brand, card: C.card, text: C.text, border: C.line } };
const stackOpts = { headerShown: false, contentStyle: { backgroundColor: C.bg } };

const tabs = (items, sidebar = false) => (
  <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    ...(sidebar ? { tabBarPosition: 'left', tabBarVariant: 'material', tabBarLabelPosition: 'beside-icon' } : {}),
    tabBarActiveTintColor: sidebar ? '#fff' : C.brand, tabBarInactiveTintColor: sidebar ? 'rgba(255,255,255,.75)' : C.muted,
    tabBarActiveBackgroundColor: sidebar ? 'rgba(255,255,255,.16)' : undefined,
    tabBarLabelStyle: { fontFamily: F.uiSB, fontSize: sidebar ? 14 : 11, lineHeight: sidebar ? 20 : 16 },
    tabBarStyle: sidebar ? { backgroundColor: C.brand, width: 210, minWidth: 210, maxWidth: 210, borderRightWidth: 0, paddingTop: 16 } : { borderTopColor: C.line, backgroundColor: C.card, height: 68, paddingTop: 6, paddingBottom: 10 },
    tabBarIcon: ({ color }) => <Feather name={items.find((i) => i[0] === route.name)[2]} size={20} color={color} />,
    tabBarButtonTestID: 'tab-' + route.name
  })}>
    {items.map(([name, comp, , label]) => <Tab.Screen key={name} name={name} component={comp} options={{ tabBarLabel: label || name }} />)}
  </Tab.Navigator>
);

const CustomerTabs = () => tabs([['Home', Home, 'home'], ['Bookings', Bookings, 'list'], ['Messages', Messages, 'message-square']]);
const ProviderTabs = () => tabs([['Requests', Requests, 'bell'], ['Calendar', Calendar, 'calendar'], ['History', History, 'credit-card'], ['Me', MyProfile, 'user', 'Profile']]);
const AdminTabs = () => tabs([['Dashboard', Dashboard, 'grid'], ['Verification', Verification, 'shield'], ['Complaints', Complaints, 'flag']], useWide());

function Customer() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="Tabs" component={CustomerTabs} />
      <Stack.Screen name="Results" component={Results} />
      <Stack.Screen name="Profile" component={ProviderProfile} />
      <Stack.Screen name="Describe" component={Describe} />
      <Stack.Screen name="Time" component={Time} />
      <Stack.Screen name="Booking" component={Booking} />
      <Stack.Screen name="Chat" component={Chat} />
      <Stack.Screen name="Rate" component={Rate} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}
function Provider() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="Tabs" component={ProviderTabs} />
      <Stack.Screen name="Request" component={Request} />
      <Stack.Screen name="Chat" component={Chat} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
}
function Auth() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function Root() {
  const { user, ready } = useSession();
  if (!ready) return <Loading />;
  return (
    <NavigationContainer theme={theme}>
      {!user ? <Auth /> : user.role === 'customer' ? <Customer /> : user.role === 'provider' ? <Provider /> : <AdminTabs />}
    </NavigationContainer>
  );
}
