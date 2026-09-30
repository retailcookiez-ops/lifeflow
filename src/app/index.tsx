
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { HabitPanel } from "@/components/habit-panel";
import { useHabits } from "@/hooks/use-habits";
import { TaskPanel } from "@/components/task-panel";
import { useTasks } from "@/hooks/use-tasks";

const GREEN = "#8BE9C0";
const BG = "#0C1015";
const CARD = "#171E27";
const MUTED = "#9CA8B5";

export default function HomeScreen() {
  const taskSystem = useTasks();
  const { tasks } = taskSystem;

  const habitSystem = useHabits();
  const habitProgress = habitSystem.progress;

  const tasksDone = tasks.filter((t) => t.done).length;
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
              {habitSystem.ready ? `${habitProgress.done}/${habitProgress.total}` : "—"}
            </Text>
            <Text style={styles.muted}>Today’s scheduled habits</Text>
            <Text style={styles.muted}>{habitSystem.ready ? `${habitProgress.percentage}% complete` : "Loading…"}</Text>
          </View>
        </View>

        <Text style={styles.section}>Your tasks</Text>
        <View style={styles.card}><TaskPanel system={taskSystem} /></View>

        <Text style={styles.section}>Daily habits</Text>
        <View style={styles.card}><HabitPanel system={habitSystem} /></View>

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