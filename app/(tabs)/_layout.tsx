import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { useDoctorStore } from '@/stores/doctorStore';
import { Colors } from '@/constants/theme';

export function TabsLayout() {
  const { isAuthenticated } = useAuth();
  const doctor = useDoctorStore((s) => s.doctor);
  const { t } = useTranslation('report');

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (doctor && !doctor.crm) return <Redirect href="/complete-profile" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: Colors.tabBorder,
          backgroundColor: Colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default TabsLayout;
