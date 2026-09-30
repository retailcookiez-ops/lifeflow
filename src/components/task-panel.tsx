import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { useTasks } from '@/hooks/use-tasks';
import { localDate, selectTasks, validFields, type Priority, type Task, type TaskFields, type TaskFilter, type TaskSort } from '@/utils/tasks';

const GREEN = '#8BE9C0';
const MUTED = '#9CA8B5';
const priorityColors: Record<Priority, string> = { low: GREEN, medium: '#F3CE83', high: '#FF9C9C' };

function Action({ label, onPress, disabled = false, selected = false, danger = false }: {
  label: string; onPress: () => void; disabled?: boolean; selected?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled}
    onPress={onPress} style={[styles.action, selected && styles.selected, disabled && styles.disabled]}>
    <Text style={{ color: danger ? '#FF9C9C' : GREEN, fontWeight: '600' }}>{label}</Text>
  </Pressable>;
}

function TaskForm({ task, disabled = false, onSave, onCancel }: {
  task?: Task; disabled?: boolean; onSave: (fields: TaskFields) => void; onCancel?: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const fields: TaskFields = { title, dueDate: dueDate.trim() || null, priority };
  const valid = validFields(fields);
  function submit() {
    if (disabled || !valid) return;
    onSave(fields);
    if (!task) { setTitle(''); setDueDate(''); setPriority('medium'); }
  }
  return <View style={styles.form}>
    <Text style={styles.label}>{task ? 'Edit task' : 'New task'}</Text>
    <TextInput accessibilityLabel={task ? 'Edit task title' : 'New task title'} style={styles.input}
      placeholder="What do you need to do?" placeholderTextColor={MUTED} selectionColor={GREEN}
      value={title} onChangeText={setTitle} maxLength={200} editable={!disabled} returnKeyType="done" onSubmitEditing={submit} />
    <Text style={styles.muted}>Due date (optional, YYYY-MM-DD)</Text>
    <TextInput accessibilityLabel="Due date, YYYY-MM-DD" style={styles.input} value={dueDate} onChangeText={setDueDate}
      placeholder="YYYY-MM-DD" placeholderTextColor={MUTED} selectionColor={GREEN} maxLength={10}
      autoCapitalize="none" editable={!disabled} returnKeyType="done" onSubmitEditing={submit} />
    <View style={styles.controls}>
      <Action label="Due today" disabled={disabled} onPress={() => setDueDate(localDate())} />
      <Action label="Clear date" disabled={disabled || !dueDate} onPress={() => setDueDate('')} />
    </View>
    {fields.dueDate !== null && !validFields({ ...fields, title: 'test' }) &&
      <Text style={styles.error} accessibilityRole="alert">Enter a real date in YYYY-MM-DD format.</Text>}
    <Text style={styles.muted}>Priority</Text>
    <View style={styles.controls}>
      {(['low', 'medium', 'high'] as const).map(value => <Action key={value} label={value}
        selected={priority === value} disabled={disabled} onPress={() => setPriority(value)} />)}
    </View>
    <View style={styles.controls}>
      <Action label={task ? 'Save changes' : '+ Add task'} disabled={disabled || !valid} onPress={submit} />
      {onCancel && <Action label="Cancel edit" onPress={onCancel} />}
    </View>
  </View>;
}

export function TaskPanel({ system }: { system: ReturnType<typeof useTasks> }) {
  const { tasks, ready, error, saving, addTask, editTask, deleteTask, toggleTask, retry } = system;
  const [filter, setFilter] = useState<TaskFilter>('Today');
  const [sort, setSort] = useState<TaskSort>('dueDate');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDate()), 30000);
    return () => clearInterval(timer);
  }, []);
  const visible = selectTasks(tasks, filter, sort, today);
  const editing = tasks.find(task => task.id === editingId);
  function changeFilter(value: TaskFilter) { setFilter(value); setEditingId(null); setDeletingId(null); }
  return <View>
    <TaskForm disabled={!ready} onSave={addTask} />
    <Text style={styles.muted} accessibilityLiveRegion="polite">
      {!ready ? (error ? 'Tasks unavailable' : 'Loading tasks…') : saving ? 'Saving…' : error ? 'Changes not saved' : 'All tasks saved'}
    </Text>
    {error && <View><Text style={styles.error} accessibilityRole="alert">{error}</Text><Action label="Retry" onPress={retry} /></View>}
    <View style={styles.controls}>
      {(['Today', 'Upcoming', 'Completed', 'All'] as const).map(value =>
        <Action key={value} label={value} selected={filter === value} onPress={() => changeFilter(value)} />)}
    </View>
    <Text style={styles.muted}>{filter === 'Today' ? 'Unfinished: today, overdue, and no due date.' : filter === 'Upcoming' ? 'Unfinished tasks due after today.' : filter === 'Completed' ? 'Your completed tasks.' : 'Every task, including completed tasks.'}</Text>
    <View style={styles.controls}>
      <Text style={styles.muted}>Sort by</Text>
      <Action label="Due date" selected={sort === 'dueDate'} onPress={() => setSort('dueDate')} />
      <Action label="Priority" selected={sort === 'priority'} onPress={() => setSort('priority')} />
    </View>
    {editing && <TaskForm key={editing.id} task={editing} onSave={fields => { editTask(editing.id, fields); setEditingId(null); }} onCancel={() => setEditingId(null)} />}
    {ready && visible.length === 0 && <View style={styles.empty}>
      <Text style={styles.label}>{tasks.length === 0 ? 'A fresh start' : filter === 'Completed' ? 'Your next win is ahead' : 'You’re all clear here'}</Text>
      <Text style={styles.muted}>{tasks.length === 0 ? 'Add your first task above. Small steps count.' : `No ${filter.toLowerCase()} tasks. Try another filter or add a task.`}</Text>
    </View>}
    {visible.map(task => <View key={task.id} style={styles.row}>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={task.title} accessibilityState={{ checked: task.done }}
        style={styles.toggle} onPress={() => toggleTask(task.id)}>
        <View style={[styles.checkbox, task.done && styles.checked]}>{task.done && <Text style={{ color: '#0C1015' }}>✓</Text>}</View>
        <Text style={[styles.title, task.done && styles.done]}>{task.title}</Text>
      </Pressable>
      <View style={styles.metadata}>
        <Text style={{ color: priorityColors[task.priority], fontSize: 12 }}>{task.priority.toUpperCase()}</Text>
        <Text style={[styles.muted, !task.done && task.dueDate !== null && task.dueDate < today && styles.error]}>
          {task.dueDate ? `${!task.done && task.dueDate < today ? 'Overdue · ' : 'Due · '}${task.dueDate}` : 'No due date'}
        </Text>
      </View>
      <View style={styles.controls}>
        {deletingId === task.id ? <>
          <Text style={styles.muted}>Delete this task?</Text>
          <Action label="Confirm delete" danger onPress={() => { deleteTask(task.id); setDeletingId(null); if (editingId === task.id) setEditingId(null); }} />
          <Action label="Cancel delete" onPress={() => setDeletingId(null)} />
        </> : <>
          <Action label="Edit" onPress={() => { setEditingId(task.id); setDeletingId(null); }} />
          <Action label="Delete" danger onPress={() => { setDeletingId(task.id); setEditingId(null); }} />
        </>}
      </View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 8, marginBottom: 16 },
  label: { color: '#F4F7FA', fontSize: 15, fontWeight: '700' },
  muted: { color: MUTED, fontSize: 12, lineHeight: 20 },
  input: { color: '#F4F7FA', backgroundColor: '#0C1015', borderColor: '#28323D', borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 48, fontSize: 14 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginVertical: 6 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#28323D' },
  selected: { backgroundColor: '#20382F', borderColor: GREEN },
  disabled: { opacity: 0.4 },
  row: { borderBottomWidth: 1, borderBottomColor: '#28323D', paddingVertical: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  title: { color: '#F4F7FA', fontSize: 14, flex: 1 },
  done: { color: MUTED, textDecorationLine: 'line-through' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#647180', alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: GREEN, borderColor: GREEN },
  metadata: { marginLeft: 34, gap: 10, flexDirection: 'row', flexWrap: 'wrap' },
  error: { color: '#FF9C9C', fontSize: 12, lineHeight: 20 },
  empty: { paddingVertical: 24, gap: 8 },
});
