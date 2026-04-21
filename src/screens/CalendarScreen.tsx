import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAllBlogsForCalendar, flattenBlogPages } from '../hooks/useBlogs';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Blog } from '../types';
import { spacing, fontSize, radius } from '../constants/theme';
import { CalendarStackParamList } from '../navigation/types';

type CalendarNavProp = NativeStackNavigationProp<CalendarStackParamList>;

export function CalendarScreen() {
  const { theme, themeName } = useTheme();
  const { session } = useAuth();
  const { colors } = theme;
  const navigation = useNavigation<CalendarNavProp>();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAllBlogsForCalendar(session?.access_token, session?.user?.id);

  // Auto-fetch all pages
  React.useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allBlogs = flattenBlogPages(data);

  // Build a map: "YYYY-MM-DD" (local date) -> Blog[]
  const dateMap = useMemo(() => {
    const map: Record<string, Blog[]> = {};
    for (const blog of allBlogs) {
      // Use the local-timezone date so the calendar day matches what the user sees
      const day = format(parseISO(blog.createdAt), 'yyyy-MM-dd');
      if (!map[day]) map[day] = [];
      map[day].push(blog);
    }
    return map;
  }, [allBlogs]);

  // Build markedDates for react-native-calendars
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const day of Object.keys(dateMap)) {
      const count = dateMap[day].length;
      marks[day] = {
        marked: true,
        dotColor: colors.primary,
        selected: day === selectedDate,
        selectedColor: day === selectedDate ? colors.primary : undefined,
        customStyles: {
          container: {
            backgroundColor: day === selectedDate ? colors.primary : 'transparent',
          },
          text: {
            color: day === selectedDate ? colors.primaryForeground : colors.foreground,
          },
        },
      };
    }
    // Highlight selected date even if no posts
    if (selectedDate && !marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: colors.muted,
      };
    }
    return marks;
  }, [dateMap, selectedDate, colors]);

  const selectedPosts = selectedDate ? (dateMap[selectedDate] ?? []) : [];

  const handleDayPress = (day: { dateString: string }) => {
    const posts = dateMap[day.dateString];
    if (posts && posts.length > 0) {
      setSelectedDate(day.dateString);
      setModalVisible(true);
    } else {
      setSelectedDate(day.dateString);
    }
  };

  const renderDayContent = (date: any) => {
    const day = date?.dateString ?? '';
    const count = dateMap[day]?.length ?? 0;
    const isSelected = day === selectedDate;
    return (
      <View style={styles.dayCell}>
        <Text
          style={[
            styles.dayNumber,
            { color: isSelected ? colors.primaryForeground : colors.foreground },
          ]}
        >
          {date?.day}
        </Text>
        {count > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countText, { color: colors.primaryForeground }]}>
              {count}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Calendar</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.closeChip,
            { backgroundColor: colors.primary, borderColor: colors.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.closeChipText, { color: colors.primaryForeground }]}>Close</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <Calendar
          key={themeName}
          style={styles.calendar}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.background,
            textSectionTitleColor: colors.mutedForeground,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.primaryForeground,
            todayTextColor: colors.primary,
            dayTextColor: colors.foreground,
            textDisabledColor: colors.mutedForeground,
            dotColor: colors.primary,
            selectedDotColor: colors.primaryForeground,
            arrowColor: colors.primary,
            monthTextColor: colors.foreground,
            indicatorColor: colors.primary,
            textDayFontWeight: '400',
            textMonthFontWeight: '700',
          }}
          markedDates={markedDates}
          markingType="custom"
          onDayPress={handleDayPress}
          dayComponent={({ date, state }: any) => {
            const day = date?.dateString ?? '';
            const count = dateMap[day]?.length ?? 0;
            const isSelected = day === selectedDate;
            const isDisabled = state === 'disabled';
            return (
              <TouchableOpacity
                onPress={() => handleDayPress(date)}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary, borderRadius: 999 },
                ]}
                activeOpacity={count > 0 ? 0.7 : 1}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isDisabled ? colors.mutedForeground : isSelected ? colors.primaryForeground : colors.foreground },
                    day === format(new Date(), 'yyyy-MM-dd') && !isSelected && { color: colors.primary, fontWeight: '700' },
                  ]}
                >
                  {date?.day}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: isSelected ? colors.primaryForeground : colors.primary }]}>
                    <Text style={[styles.countText, { color: isSelected ? colors.primary : colors.primaryForeground }]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Post list modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Sheet header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {selectedDate
                  ? format(parseISO(selectedDate), 'MMMM d, yyyy')
                  : ''}
              </Text>
              <Text style={[styles.sheetCount, { color: colors.mutedForeground }]}>
                {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: colors.mutedForeground }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedPosts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xl * 3 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.postItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('PostDetail', { postId: item.id });
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.postItemInner}>
                    <Text style={[styles.postTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.postMeta, { color: colors.mutedForeground }]}>
                      {format(parseISO(item.createdAt), 'h:mm a')}
                      {item.authorName ? `  ·  ${item.authorName}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: colors.mutedForeground }]}>›</Text>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeChipText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  calendar: {
    marginTop: spacing.sm,
  },
  dayCell: {
    width: 36,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNumber: {
    fontSize: 14,
  },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  countText: {
    fontSize: 9,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  sheetCount: {
    fontSize: fontSize.sm,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeBtnText: {
    fontSize: fontSize.lg,
  },
  postItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postItemInner: {
    flex: 1,
    gap: 3,
  },
  postTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  postMeta: {
    fontSize: fontSize.xs,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
});
