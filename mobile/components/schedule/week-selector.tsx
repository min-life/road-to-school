import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/constants/theme';
import { formatWeekHeaderRange, type getWeekDaysFromMonday } from '@/utils/date';
import { scheduleStyles as styles } from './schedule-styles';

interface Props {
  weekDays: ReturnType<typeof getWeekDaysFromMonday>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function ScheduleWeekSelector({ weekDays, selectedDate, onSelectDate, onPreviousWeek, onNextWeek }: Props) {
  return (
    <View style={styles.weekSelectorContainer}>
        <View style={styles.weekNavRow}>
          <TouchableOpacity onPress={onPreviousWeek} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={styles.weekRangeText}>
            {formatWeekHeaderRange(weekDays[0]?.dateStr || '', weekDays[6]?.dateStr || '')}
          </Text>

          <TouchableOpacity onPress={onNextWeek} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* 7 Days Bar */}
        <View style={styles.daysRow}>
          {weekDays.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <TouchableOpacity
              key={d.dateStr}
              onPress={() => onSelectDate(d.dateStr)}
              style={[
                styles.dayCard,
                isSelected && styles.dayCardSelected,
                d.isToday && !isSelected && styles.dayCardToday,
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayTextSelected]}>
                {d.dayLabel}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                {d.dateNum}
              </Text>
              {d.isToday && <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />}
            </TouchableOpacity>
            );
          })}
        </View>
      </View>
  );
}
