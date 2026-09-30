import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { useCloudHabits } from '@/hooks/use-cloud-habits';
import { WEEKDAYS, consistency, dateObject, dayStatus, scheduledOn, validHabitFields, weekdaysOn, weekDates, type HabitFields, type Weekday } from '@/utils/habits';

const GREEN = '#8BE9C0';
const MUTED = '#9CA8B5';
const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

function Action({ label, onPress, disabled = false, selected = false, danger = false }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled}
    onPress={onPress} style={[styles.action, selected && styles.selected, disabled && styles.disabled]}>
    <Text style={{ color: danger ? '#FF9C9C' : GREEN, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}
function HabitForm({ initial, disabled = false, onSave, onCancel }: {
  initial?: HabitFields; disabled?: boolean; onSave: (fields: HabitFields) => Promise<boolean>; onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [weekdays, setWeekdays] = useState<Weekday[]>(initial?.weekdays ?? [1, 2, 3, 4, 5, 6, 0]);
  const fields = { title, weekdays };
  async function submit() {
    if (disabled || !validHabitFields(fields)) return;
    const saved = await onSave(fields);
    if (saved && !initial) { setTitle(''); setWeekdays([1, 2, 3, 4, 5, 6, 0]); }
  }
  return <View style={styles.form}>
    <Text style={styles.label}>{initial ? 'Edit habit' : 'New habit'}</Text>
    <TextInput accessibilityLabel={initial ? 'Edit habit name' : 'New habit name'} style={styles.input}
      placeholder="Name your habit" placeholderTextColor={MUTED} selectionColor={GREEN}
      value={title} onChangeText={setTitle} maxLength={200} editable={!disabled}
      returnKeyType="done" onSubmitEditing={() => { void submit(); }} />
    <Text style={styles.muted}>Repeat on · choose at least one weekday</Text>
    <View style={styles.controls}>
      {DAY_ORDER.map(day => <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={WEEKDAYS[day]}
        accessibilityState={{ checked: weekdays.includes(day), disabled }} disabled={disabled}
        style={[styles.action, weekdays.includes(day) && styles.selected, disabled && styles.disabled]}
        onPress={() => setWeekdays(old => old.includes(day) ? old.filter(value => value !== day) : [...old, day])}>
        <Text style={styles.green}>{WEEKDAYS[day]}</Text>
      </Pressable>)}
    </View>
    {weekdays.length === 0 && <Text style={styles.error} accessibilityRole="alert">Choose at least one weekday.</Text>}
    {initial && <Text style={styles.muted}>Schedule changes apply from today. Earlier history stays unchanged.</Text>}
    <View style={styles.controls}>
      <Action label={initial ? 'Save habit' : '+ Add habit'} disabled={disabled || !validHabitFields(fields)} onPress={() => { void submit(); }} />
      {onCancel && <Action label="Cancel edit" disabled={disabled} onPress={onCancel} />}
    </View>
  </View>;
}
const symbols = { complete: '✓', missed: '×', pending: '○', future: '·', off: '—' };
const colors = { complete: GREEN, missed: '#FF9C9C', pending: '#F3CE83', future: MUTED, off: '#65717F' };

export function HabitPanel({ system }: { system: ReturnType<typeof useCloudHabits> }) {
  const { habits, today, ready, error, saving, addHabit, editHabit, deleteHabit, toggleToday, retry } = system;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const editing = habits.find(habit => habit.id === editingId);
  const dates = weekDates(today, weekOffset);
  return <View>
    <HabitForm disabled={!ready || saving} onSave={addHabit} />
    <Text style={styles.muted} accessibilityLiveRegion="polite">
      {!ready ? (error ? 'Habits unavailable' : 'Loading habits and history…') : saving ? 'Saving…' : error ? 'Cloud sync needs attention' : 'Habits and history synced to your account'}
    </Text>
    {error && <View><Text style={styles.error} accessibilityRole="alert">{error}</Text><Action label="Retry / Sync now" disabled={saving} onPress={retry} /></View>}
    {editing && <HabitForm key={editing.id} disabled={saving} initial={{ title: editing.title, weekdays: weekdaysOn(editing, today) }}
      onSave={async fields => { const saved = await editHabit(editing.id, fields); if (saved) setEditingId(null); return saved; }} onCancel={() => setEditingId(null)} />}
    {ready && habits.length === 0 && <View style={styles.empty}>
      <Text style={styles.label}>Build your first habit</Text>
      <Text style={styles.muted}>Pick a small action and the days you want to repeat it. Check in when you have done it.</Text>
    </View>}
    {ready && habits.length > 0 && system.progress.total === 0 && <Text style={[styles.muted, styles.note]}>No habits scheduled today. Your next check-in will be on a chosen weekday.</Text>}
    {habits.map(habit => {
      const scheduled = scheduledOn(habit, today);
      const done = habit.completions.includes(today);
      const stats = consistency(habit, today);
      const weekdays = weekdaysOn(habit, today);
      return <View key={habit.id} style={styles.row}>
        <Text style={styles.title}>{habit.title}</Text>
        <Text style={styles.muted}>{DAY_ORDER.filter(day => weekdays.includes(day)).map(day => WEEKDAYS[day]).join(' · ')}</Text>
        <Text style={[styles.muted, scheduled && styles.green]}>{scheduled ? 'Scheduled today' : 'Not scheduled today'}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Complete ${habit.title} for today`}
          accessibilityState={{ checked: scheduled && done, disabled: !scheduled || !ready || saving }} disabled={!scheduled || !ready || saving}
          onPress={() => { void toggleToday(habit.id); }} style={[styles.checkIn, (!scheduled || !ready || saving) && styles.disabled]}>
          <Text style={styles.green}>{scheduled && done ? '✓ Complete today · tap to undo' : scheduled ? '○ Mark complete for today' : 'Rest day'}</Text>
        </Pressable>
        <Text style={styles.muted}>{stats.percentage === null ? 'No scheduled days in the last 7 days.' : `${stats.percentage}% consistency · ${stats.done}/${stats.total} scheduled days completed`}</Text>
        <View style={styles.controls}>
          {deletingId === habit.id ? <>
            <Text style={styles.error}>Delete this habit and all its history?</Text>
            <Action label="Confirm delete" danger disabled={saving} onPress={() => { void deleteHabit(habit.id).then(saved => { if (saved) { setDeletingId(null); if (editingId === habit.id) setEditingId(null); } }); }} />
            <Action label="Cancel delete" disabled={saving} onPress={() => setDeletingId(null)} />
          </> : <>
            <Action label="Edit habit" disabled={saving} onPress={() => { setEditingId(habit.id); setDeletingId(null); }} />
            <Action label="Delete habit" disabled={saving} danger onPress={() => { setDeletingId(habit.id); setEditingId(null); }} />
          </>}
        </View>
      </View>;
    })}
    {habits.length > 0 && <View style={styles.history}>
      <Text style={styles.label}>Weekly history</Text>
      <View style={styles.controls}>
        <Action label="Previous week" onPress={() => setWeekOffset(old => old - 1)} />
        <Action label="This week" selected={weekOffset === 0} onPress={() => setWeekOffset(0)} />
        <Action label="Next week" disabled={weekOffset >= 0} onPress={() => setWeekOffset(old => Math.min(0, old + 1))} />
      </View>
      <Text style={styles.muted}>{dates[0]} – {dates[6]}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Weekly habit history grid" contentContainerStyle={styles.grid}>
        <View>
          <View style={styles.gridRow}>
            <Text style={styles.gridName}>Habit</Text>
            {dates.map(day => <View key={day} style={[styles.cell, day === today && styles.todayCell]}>
              <Text style={styles.muted}>{WEEKDAYS[dateObject(day).getDay()]}</Text>
              <Text style={styles.muted}>{day.slice(5)}</Text>
            </View>)}
          </View>
          {habits.map(habit => <View key={habit.id} style={styles.gridRow}>
            <Text style={styles.gridName} numberOfLines={2}>{habit.title}</Text>
            {dates.map(day => {
              const status = dayStatus(habit, day, today);
              return <View key={day} style={[styles.cell, day === today && styles.todayCell]} accessibilityLabel={`${habit.title}, ${day}: ${status}`}>
                <Text style={{ color: colors[status], fontSize: 18 }}>{symbols[status]}</Text>
              </View>;
            })}
          </View>)}
        </View>
      </ScrollView>
      <Text style={styles.muted}>✓ Complete · × Missed · ○ Today pending · · Future · — Not scheduled</Text>
      <Text style={[styles.muted, styles.note]}>History is read-only. Consistency covers the last 7 calendar days including today, only since the habit was created. Today counts as incomplete until you check in.</Text>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 8, marginBottom: 16 },
  label: { color: '#F4F7FA', fontSize: 15, fontWeight: '700' },
  muted: { color: MUTED, fontSize: 12, lineHeight: 20 },
  green: { color: GREEN },
  input: { color: '#F4F7FA', backgroundColor: '#0C1015', borderColor: '#28323D', borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 48, fontSize: 14 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginVertical: 6 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#28323D' },
  selected: { backgroundColor: '#20382F', borderColor: GREEN },
  disabled: { opacity: 0.4 },
  row: { borderBottomWidth: 1, borderBottomColor: '#28323D', paddingVertical: 16, gap: 6 },
  title: { color: '#F4F7FA', fontSize: 15, fontWeight: '600' },
  checkIn: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
  error: { color: '#FF9C9C', fontSize: 12, lineHeight: 20 },
  empty: { paddingVertical: 24, gap: 8 },
  note: { marginTop: 12 },
  history: { marginTop: 20, gap: 8 },
  grid: { paddingVertical: 10 },
  gridRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  gridName: { color: '#F4F7FA', fontSize: 12, width: 130, paddingRight: 12 },
  cell: { width: 50, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderColor: '#28323D' },
  todayCell: { backgroundColor: '#20382F' },
});
