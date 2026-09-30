
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from "react-native";

import { useTasks } from "@/hooks/use-tasks";

const GREEN = "#8BE9C0";
const BG = "#0C1015";
const CARD = "#171E27";
const MUTED = "#9CA8B5";

export default function HomeScreen() {
  const { tasks, ready, error, saving, addTask, editTask, deleteTask, toggleTask, retry } = useTasks();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function submitTask() {
    if (!draft.trim() || !ready) return;
    addTask(draft);
    setDraft("");
  }

  const [habits, setHabits] = useState([
    { id: 1, title: "Drink enough water", icon: "💧", done: true },
    { id: 2, title: "Read 20 minutes", icon: "📚", done: false },
    { id: 3, title: "Morning routine", icon: "☀️", done: false },
  ]);

  const tasksDone = tasks.filter((t) => t.done).length;
  const habitsDone = habits.filter((h) => h.done).length;
  const progress = tasks.length
    ? (tasksDone / tasks.length) * 100
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              LIFE<Text style={{ color: GREEN }}>FLOW</Text>
            </Text>
            <Text style={styles.muted}>Your personal growth space</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{ color: GREEN, fontWeight: "bold" }}>Y</Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>YOUR DASHBOARD</Text>
        <Text style={styles.heading}>Today</Text>
        <Text style={[styles.muted, { marginBottom: 24 }]}>
          Small steps. Consistent progress.
        </Text>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>DAILY PROGRESS</Text>
          <Text style={styles.percentage}>{Math.round(progress)}%</Text>
          <Text style={styles.muted}>
            {tasksDone} of {tasks.length} tasks completed
          </Text>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${progress}%` }]}
            />
          </View>
        </View>

        <View style={styles.stats}>
          <View style={[styles.card, styles.stat]}>
            <Text style={styles.statNumber}>
              {tasksDone}/{tasks.length}
            </Text>
            <Text style={styles.muted}>Tasks completed</Text>
          </View>
          <View style={[styles.card, styles.stat]}>
            <Text style={styles.statNumber}>
              {habitsDone}/{habits.length}
            </Text>
            <Text style={styles.muted}>Habits completed</Text>
          </View>
        </View>

        <Text style={styles.section}>Today&apos;s tasks</Text>
        <View style={styles.card}>
          <TextInput
            accessibilityLabel="New task title"
            placeholder="What do you need to do?"
            placeholderTextColor={MUTED}
            selectionColor={GREEN}
            style={styles.taskInput}
            value={draft}
            onChangeText={setDraft}
            editable={ready}
            maxLength={200}
            returnKeyType="done"
            onSubmitEditing={submitTask}
          />
          <Pressable accessibilityRole="button" disabled={!ready || !draft.trim()}
            style={[styles.addButton, (!ready || !draft.trim()) && styles.disabled]}
            onPress={submitTask}>
            <Text style={styles.addLabel}>+ Add task</Text>
          </Pressable>
          <Text style={styles.muted} accessibilityLiveRegion="polite">
            {!ready ? (error ? "Tasks unavailable" : "Loading tasks…") : saving ? "Saving…" : error ? "Changes not saved" : "All tasks saved"}
          </Text>
          {error && <View>
            <Text style={styles.error} accessibilityRole="alert">{error}</Text>
            <Pressable accessibilityRole="button" style={styles.action} onPress={retry}>
              <Text style={styles.actionLabel}>Retry</Text>
            </Pressable>
          </View>}
          {ready && tasks.length === 0 && <Text style={[styles.muted, { marginTop: 16 }]}>No tasks yet. Add your first task above.</Text>}
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              {editingId === task.id ? <View>
                <TextInput accessibilityLabel="Edit task title" style={styles.taskInput}
                  value={editTitle} onChangeText={setEditTitle} maxLength={200}
                  selectionColor={GREEN} autoFocus returnKeyType="done"
                  onSubmitEditing={() => { if (editTitle.trim()) { editTask(task.id, editTitle); setEditingId(null); } }} />
                <View style={styles.actions}>
                  <Pressable accessibilityRole="button" style={styles.action} disabled={!editTitle.trim()}
                    onPress={() => { editTask(task.id, editTitle); setEditingId(null); }}>
                    <Text style={[styles.actionLabel, !editTitle.trim() && styles.disabled]}>Save</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" style={styles.action} onPress={() => setEditingId(null)}>
                    <Text style={styles.muted}>Cancel</Text>
                  </Pressable>
                </View>
              </View> : <>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}
                  accessibilityLabel={task.title} style={styles.taskToggle} onPress={() => toggleTask(task.id)}>
                  <View style={[styles.checkbox, task.done && styles.checked]}>
                    {task.done && <Text style={styles.check}>✓</Text>}
                  </View>
                  <Text style={[styles.itemText, task.done && styles.strikethrough]}>{task.title}</Text>
                </Pressable>
                <View style={styles.actions}>
                  {deletingId === task.id ? <>
                    <Text style={styles.muted}>Delete this task?</Text>
                    <Pressable accessibilityRole="button" style={styles.action} onPress={() => { deleteTask(task.id); setDeletingId(null); }}>
                      <Text style={styles.error}>Delete</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={styles.action} onPress={() => setDeletingId(null)}>
                      <Text style={styles.muted}>Cancel</Text>
                    </Pressable>
                  </> : <>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`} style={styles.action}
                      onPress={() => { setEditingId(task.id); setEditTitle(task.title); setDeletingId(null); }}>
                      <Text style={styles.actionLabel}>Edit</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`} style={styles.action} onPress={() => setDeletingId(task.id)}>
                      <Text style={styles.muted}>Delete</Text>
                    </Pressable>
                  </>}
                </View>
              </>}
            </View>
          ))}
        </View>

        <Text style={styles.section}>Daily habits</Text>
        <View style={styles.card}>
          {habits.map((habit) => (
            <Pressable
              key={habit.id}
              style={styles.item}
              onPress={() =>
                setHabits((old) =>
                  old.map((h) =>
                    h.id === habit.id ? { ...h, done: !h.done } : h
                  )
                )
              }
            >
              <Text style={styles.habitIcon}>{habit.icon}</Text>
              <Text style={styles.itemText}>{habit.title}</Text>
              <Text style={{ color: habit.done ? GREEN : MUTED }}>
                {habit.done ? "✓ Done" : "Check in"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Your AI coach</Text>
        <View style={[styles.card, styles.aiCard]}>
          <Text style={{ color: "#A9B8FF", fontWeight: "bold" }}>
            ✦ LIFEFLOW INTELLIGENCE
          </Text>
          <Text style={styles.aiTitle}>
            Focus on one thing at a time.
          </Text>
          <Text style={styles.muted}>
            Start with your next task. A little progress now can
            help build momentum for the rest of your day.
          </Text>
          <Text style={styles.aiNote}>
            DEMO SUGGESTION — NOT AI-GENERATED
          </Text>
        </View>

        <Text style={styles.footer}>
          LIFEFLOW · YOUR PROGRESS, CONNECTED.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  taskInput: { color: "#F4F7FA", backgroundColor: BG, borderColor: "#28323D", borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 48, marginBottom: 8, fontSize: 14 },
  addButton: { backgroundColor: GREEN, borderRadius: 10, padding: 12, alignItems: "center", marginBottom: 12, minHeight: 44 },
  addLabel: { color: BG, fontWeight: "bold" },
  disabled: { opacity: 0.4 },
  taskRow: { borderBottomWidth: 1, borderBottomColor: "#28323D", paddingVertical: 10 },
  taskToggle: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  actions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginLeft: 34 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  actionLabel: { color: GREEN, fontSize: 13, fontWeight: "bold" },
  error: { color: "#FF9C9C", fontSize: 13, lineHeight: 20 },
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    padding: 22,
    paddingTop: 35,
    paddingBottom: 50,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    color: "#F4F7FA",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  muted: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  heading: {
    color: "#F4F7FA",
    fontSize: 38,
    fontWeight: "800",
    marginTop: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#28323D",
  },
  percentage: {
    color: GREEN,
    fontSize: 40,
    fontWeight: "800",
    marginTop: 8,
  },
  track: {
    height: 7,
    backgroundColor: "#202A35",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 20,
  },
  fill: {
    height: "100%",
    backgroundColor: GREEN,
    borderRadius: 10,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },
  stat: {
    flex: 1,
    marginBottom: 0,
  },
  statNumber: {
    color: "#F4F7FA",
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 5,
  },
  section: {
    color: "#F4F7FA",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 14,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 55,
    borderBottomWidth: 1,
    borderBottomColor: "#28323D",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#647180",
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  check: {
    color: BG,
    fontWeight: "bold",
  },
  itemText: {
    flex: 1,
    color: "#F4F7FA",
    fontSize: 13,
  },
  strikethrough: {
    color: MUTED,
    textDecorationLine: "line-through",
  },
  habitIcon: {
    fontSize: 20,
  },
  aiCard: {
    backgroundColor: "#191D2C",
    borderColor: "#34374F",
    marginTop: 0,
  },
  aiTitle: {
    color: "#F4F7FA",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
  },
  aiNote: {
    color: "#A9B8FF",
    fontSize: 10,
    marginTop: 18,
    fontWeight: "bold",
  },
  footer: {
    color: "#65717F",
    fontSize: 10,
    textAlign: "center",
    marginTop: 25,
    letterSpacing: 1,
  },
});