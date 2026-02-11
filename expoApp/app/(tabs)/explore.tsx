import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = getStyles(isDark);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const studyResources = [
    {
      title: "📚 Khan Academy",
      description: "Free online courses and practice exercises",
      url: "https://www.khanacademy.org/",
      category: "Learning"
    },
    {
      title: "🧮 Wolfram Alpha",
      description: "Computational knowledge engine for math and science",
      url: "https://www.wolframalpha.com/",
      category: "Math & Science"
    },
    {
      title: "📖 Project Gutenberg",
      description: "Free eBooks and literature",
      url: "https://www.gutenberg.org/",
      category: "Reading"
    },
    {
      title: "🎓 Coursera",
      description: "Online courses from top universities",
      url: "https://www.coursera.org/",
      category: "Learning"
    }
  ];

  const studyTips = [
    "🎯 Set specific, achievable goals for each study session",
    "⏰ Use the Pomodoro Technique: 25 minutes focused study, 5 minute break",
    "📝 Take handwritten notes to improve retention",
    "🔄 Review material within 24 hours to strengthen memory",
    "🤝 Form study groups with classmates",
    "💤 Get adequate sleep - it's crucial for memory consolidation"
  ];

  const quickActions = [
    {
      title: "📅 Academic Calendar",
      description: "View important dates and deadlines",
      action: () => Alert.alert("Academic Calendar", "Feature coming soon!")
    },
    {
      title: "📊 Grade Calculator",
      description: "Calculate your GPA and track progress",
      action: () => Alert.alert("Grade Calculator", "Feature coming soon!")
    },
    {
      title: "⏰ Study Timer",
      description: "Focus timer for productive study sessions",
      action: () => Alert.alert("Study Timer", "Feature coming soon!")
    },
    {
      title: "📚 Library Resources",
      description: "Access digital library and e-books",
      action: () => Alert.alert("Library", "Feature coming soon!")
    }
  ];

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore & Learn</Text>
          <Text style={styles.headerSubtitle}>
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <Text style={styles.timeText}>
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.action}
              >
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Study Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Resources</Text>
          {studyResources.map((resource, index) => (
            <TouchableOpacity
              key={index}
              style={styles.resourceCard}
              onPress={() => openLink(resource.url)}
            >
              <View style={styles.resourceContent}>
                <Text style={styles.resourceTitle}>{resource.title}</Text>
                <Text style={styles.resourceDescription}>{resource.description}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{resource.category}</Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Study Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study Tips</Text>
          <View style={styles.tipsContainer}>
            {studyTips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Motivational Quote */}
        <View style={styles.section}>
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>
              "Education is the most powerful weapon which you can use to change the world."
            </Text>
            <Text style={styles.quoteAuthor}>- Nelson Mandela</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: isDark ? '#0B0F14' : '#E0F2FE' 
    },
    scrollView: { 
      flex: 1 
    },
    header: { 
      padding: 20, 
      paddingTop: 10, 
      alignItems: 'center' 
    },
    headerTitle: { 
      fontSize: 28, 
      fontWeight: '700', 
      color: isDark ? '#93C5FD' : '#1E3A8A',
      marginBottom: 8
    },
    headerSubtitle: { 
      fontSize: 16, 
      color: isDark ? '#9CA3AF' : '#1E3A8A', 
      marginBottom: 4
    },
    timeText: {
      fontSize: 20,
      fontWeight: '600',
      color: isDark ? '#60A5FA' : '#2563EB',
      fontFamily: 'monospace'
    },
    section: { 
      paddingHorizontal: 20, 
      marginBottom: 24 
    },
    sectionTitle: { 
      fontSize: 20, 
      fontWeight: '700', 
      color: isDark ? '#93C5FD' : '#1E3A8A', 
      marginBottom: 16 
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12
    },
    actionCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      width: '48%',
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      minHeight: 100,
      justifyContent: 'center'
    },
    actionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
      marginBottom: 4
    },
    actionDescription: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      lineHeight: 16
    },
    resourceCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      flexDirection: 'row',
      alignItems: 'center'
    },
    resourceContent: {
      flex: 1
    },
    resourceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#1F2937',
      marginBottom: 4
    },
    resourceDescription: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 8
    },
    categoryBadge: {
      backgroundColor: isDark ? '#1F2937' : '#DBEAFE',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'flex-start'
    },
    categoryText: {
      fontSize: 12,
      fontWeight: '500',
      color: isDark ? '#93C5FD' : '#1E3A8A'
    },
    tipsContainer: {
      gap: 12
    },
    tipCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      borderLeftWidth: 4,
      borderLeftColor: isDark ? '#60A5FA' : '#3B82F6'
    },
    tipText: {
      fontSize: 14,
      color: isDark ? '#E5E7EB' : '#1F2937',
      lineHeight: 20
    },
    quoteCard: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: isDark ? '#1F2937' : '#93C5FD',
      alignItems: 'center'
    },
    quoteText: {
      fontSize: 16,
      fontStyle: 'italic',
      color: isDark ? '#E5E7EB' : '#1F2937',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 12
    },
    quoteAuthor: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#93C5FD' : '#1E3A8A'
    }
  });
}
