import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCoreCoursesForBatchAndSection, getElectivesForBatch, type Course } from '../utils/dataParser';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllSlotsForDay, getTodayDayName, classifySlot, minutesUntil,
  requestNotificationPermission, scheduleClassReminder, type ParsedSlot,
} from '../utils/timeUtils';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type TabView = 'today' | 'week';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState<TabView>('today');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [todaySlots, setTodaySlots] = useState<ParsedSlot[]>([]);
  const [batch, setBatch] = useState('');
  const [section, setSection] = useState('');

  const buildSchedule = useCallback((loadedCourses: Course[]) => {
    const today = getTodayDayName();
    setTodaySlots(getAllSlotsForDay(loadedCourses, today));
  }, []);

  useEffect(() => {
    const storedBatch = localStorage.getItem('user-batch');
    const storedSection = localStorage.getItem('user-section');
    const electivesRaw = localStorage.getItem('user-electives');

    if (!storedBatch || !storedSection) {
      navigate('/', { replace: true });
      return;
    }

    setBatch(storedBatch);
    setSection(storedSection);

    let selectedElectives: string[] = [];
    try { selectedElectives = JSON.parse(electivesRaw || '[]'); } catch {}

    const core = getCoreCoursesForBatchAndSection(storedBatch, storedSection);
    const allElectives = getElectivesForBatch(storedBatch);
    const myElectives = allElectives.filter(e => selectedElectives.includes(e.course_code));
    const allCourses = [...core, ...myElectives];
    setCourses(allCourses);
    buildSchedule(allCourses);

    // Tick every 30 seconds
    const timer = setInterval(() => setNow(new Date()), 30000);

    // Request notifications
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }

    return () => clearInterval(timer);
  }, [navigate, buildSchedule]);

  // Reschedule reminders when today's slots update
  useEffect(() => {
    if (notifPermission === 'granted') {
      todaySlots.forEach(slot => scheduleClassReminder(slot, 10));
    }
  }, [todaySlots, notifPermission]);

  const handleRequestNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      todaySlots.forEach(slot => scheduleClassReminder(slot, 10));
    }
  };

  // Compute next/live class from todaySlots
  const liveSlot = todaySlots.find(s => classifySlot(s, now) === 'live');
  const nextSlot = todaySlots.find(s => classifySlot(s, now) === 'upcoming');
  const focusSlot = liveSlot || nextSlot;

  const totalCreditHours = courses.reduce((sum, c) => sum + (c.credit_hours || 0), 0);
  const todayCount = todaySlots.length;

  // Short batch name for display
  const batchShort = batch.match(/Computer Science\s+(\w+)/i)?.[1]
    ? `CS ${batch.match(/Computer Science\s+(\w+)/i)![1]}`
    : batch.match(/Software Engineering\s+(\w+)/i)?.[1]
    ? `SE ${batch.match(/Software Engineering\s+(\w+)/i)![1]}`
    : 'My Semester';

  return (
    <div className="font-body-md text-on-surface bg-background dark:bg-gray-950 min-h-screen transition-colors duration-300">
      {/* Top Navigation */}
      <header className="flex justify-between items-center px-4 py-3 w-full sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-primary dark:text-primary-fixed-dim font-black tracking-widest text-xl uppercase">BNU SCIT</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="material-symbols-outlined text-primary dark:text-primary-fixed-dim p-2 hover:bg-surface-container dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </button>
          {notifPermission !== 'granted' && (
            <button
              onClick={handleRequestNotif}
              className="text-xs font-semibold text-primary bg-primary-fixed px-3 py-1.5 rounded-full hover:bg-primary-fixed-dim transition-colors hidden sm:block"
            >
              Enable Reminders
            </button>
          )}
          <button className="material-symbols-outlined text-primary dark:text-primary-fixed-dim p-2 hover:bg-surface-container dark:hover:bg-gray-800 rounded-full transition-colors relative">
            notifications
            {notifPermission === 'granted' && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-6 flex gap-6">
        {/* Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-[260px] sticky top-20 h-[calc(100vh-80px)] py-4 shrink-0">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setTab('today')}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 mx-2 transition-all text-left ${tab === 'today' ? 'bg-primary text-on-primary translate-x-1' : 'text-secondary dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary-fixed-dim'}`}
            >
              <span className="material-symbols-outlined" style={tab === 'today' ? { fontVariationSettings: "'FILL' 1" } : {}}>school</span>
              <span className="text-sm font-medium">My Semester</span>
            </button>
            <button
              onClick={() => setTab('week')}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 mx-2 transition-all text-left ${tab === 'week' ? 'bg-primary text-on-primary translate-x-1' : 'text-secondary dark:text-gray-400 hover:bg-surface-container-high dark:hover:bg-gray-800 hover:text-primary dark:hover:text-primary-fixed-dim'}`}
            >
              <span className="material-symbols-outlined" style={tab === 'week' ? { fontVariationSettings: "'FILL' 1" } : {}}>calendar_month</span>
              <span className="text-sm font-medium">Weekly Schedule</span>
            </button>
            <div className="mt-auto pt-4 border-t border-outline-variant dark:border-gray-800 mx-2">
              <button
                onClick={() => { localStorage.clear(); navigate('/'); }}
                className="w-full flex items-center gap-3 text-secondary dark:text-gray-400 px-4 py-3 hover:bg-error-container hover:text-error transition-colors rounded-lg"
              >
                <span className="material-symbols-outlined">logout</span>
                <span className="text-sm font-medium">Change Settings</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-xl">
              <p className="text-label-md text-secondary dark:text-gray-400 uppercase font-bold">Today's Classes</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-headline-lg text-primary dark:text-primary-fixed-dim">{todayCount > 0 ? String(todayCount).padStart(2, '0') : '00'}</span>
                <span className="text-body-md text-secondary dark:text-gray-400">Sessions</span>
              </div>
            </div>
            <div className="glass-card p-5 rounded-xl">
              <p className="text-label-md text-secondary dark:text-gray-400 uppercase font-bold">Credit Hours</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-headline-lg text-primary dark:text-primary-fixed-dim">{totalCreditHours}</span>
                <span className="text-body-md text-secondary dark:text-gray-400">Cr.Hrs</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary to-primary-container dark:from-primary-container dark:to-primary p-5 rounded-xl shadow-lg col-span-2 hidden lg:block border border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-label-md text-primary-fixed dark:text-primary-fixed-dim uppercase font-bold">Active Program</p>
                  <p className="text-headline-sm text-on-primary mt-1">{batchShort} · Section {section}</p>
                  <p className="text-body-md text-primary-fixed dark:text-primary-fixed-dim mt-1">{courses.length} courses enrolled</p>
                </div>
                <span className="material-symbols-outlined text-white opacity-40 text-5xl">workspace_premium</span>
              </div>
            </div>
          </section>

          {/* Live / Next Class Focus Card */}
          {focusSlot ? (
            <section>
              <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary-container to-primary-fixed-dim dark:from-gray-900 dark:via-primary-container dark:to-primary text-on-primary rounded-xl p-6 shadow-2xl border border-white/10">
                <div className="absolute -top-12 -right-12 p-8 opacity-20 rotate-12">
                  <span className="material-symbols-outlined text-[160px]">psychology</span>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    {liveSlot ? (
                      <span className="bg-error px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider text-on-error">Live Now</span>
                    ) : (
                      <span className="bg-primary-container dark:bg-primary px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider text-on-primary-container dark:text-on-primary">Up Next</span>
                    )}
                    {nextSlot && !liveSlot && (
                      <span className="text-label-sm text-primary-fixed dark:text-primary-fixed-dim">
                        Starts in {minutesUntil(nextSlot, now)} min
                      </span>
                    )}
                  </div>
                  <h2 className="text-headline-lg font-black mb-3 leading-tight">{focusSlot.course.course_name}</h2>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-fixed dark:text-primary-fixed-dim text-sm">schedule</span>
                      <span className="text-body-md font-semibold">{focusSlot.startLabel} – {focusSlot.endLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-fixed dark:text-primary-fixed-dim text-sm">location_on</span>
                      <span className="text-body-md font-semibold">{focusSlot.venue || 'TBA'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-fixed dark:text-primary-fixed-dim text-sm">person</span>
                      <span className="text-body-md font-semibold">{focusSlot.course.faculty}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : todaySlots.length > 0 ? (
            <section>
              <div className="bg-secondary-container dark:bg-gray-800 p-6 rounded-xl text-center">
                <span className="material-symbols-outlined text-4xl text-secondary dark:text-gray-400">celebration</span>
                <p className="text-headline-sm text-on-secondary-container dark:text-gray-200 mt-2">All done for today! 🎉</p>
                <p className="text-body-md text-secondary dark:text-gray-400">No more classes remaining.</p>
              </div>
            </section>
          ) : null}


          {/* Tab: Today's Timeline */}
          {tab === 'today' && (
            <section>
              <div className="flex justify-between items-end mb-4 px-1">
                <div>
                  <h3 className="text-headline-sm text-on-surface dark:text-gray-100">Today's Timeline</h3>
                  <p className="text-body-md text-secondary dark:text-gray-400">
                    {getTodayDayName()}, {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setTab('week')} className="text-primary dark:text-primary-fixed-dim font-bold text-sm hover:underline">View Week →</button>
              </div>

              {todaySlots.length === 0 ? (
                <div className="text-center py-12 text-secondary dark:text-gray-500">
                  <span className="material-symbols-outlined text-5xl block mb-3 opacity-40">weekend</span>
                  <p className="text-headline-sm">No classes today</p>
                  <p className="text-body-md">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-[2px] before:bg-gray-200 dark:before:bg-gray-800">
                  {todaySlots.map((slot, idx) => {
                    const status = classifySlot(slot, now);
                    return (
                      <div key={idx} className="relative pl-12">
                        <div className={`absolute left-4 top-5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-950 z-10 shadow-sm ${
                          status === 'live' ? 'bg-error animate-pulse' :
                          status === 'past' ? 'bg-gray-300 dark:bg-gray-700' : 'bg-primary dark:bg-primary-fixed-dim'
                        }`} />
                        <div className={`glass-card p-5 rounded-xl flex items-center justify-between transition-all ${
                          status === 'live' ? 'ring-2 ring-error/50' :
                          status === 'past' ? 'opacity-50' :
                          'hover:border-primary-fixed-dim'
                        }`}>
                          <div className="flex flex-col min-w-0">
                            <span className="text-label-sm text-secondary dark:text-gray-400 font-bold uppercase tracking-wide">
                              {slot.startLabel} – {slot.endLabel}
                            </span>
                            <h4 className="text-headline-sm text-on-surface dark:text-gray-100 truncate">{slot.course.course_name}</h4>
                            <p className="text-body-md text-secondary dark:text-gray-400">Room: {slot.venue || 'TBA'} · {slot.course.faculty || 'TBA'}</p>
                          </div>
                          {status === 'live' && (
                            <span className="ml-4 shrink-0 bg-error text-on-error text-[10px] font-black uppercase px-2 py-1 rounded">Live</span>
                          )}
                          {status === 'upcoming' && minutesUntil(slot, now) <= 30 && (
                            <span className="ml-4 shrink-0 text-label-sm text-primary dark:text-primary-fixed-dim font-bold">
                              in {minutesUntil(slot, now)}m
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Tab: Weekly Schedule */}
          {tab === 'week' && (
            <section>
              <div className="flex justify-between items-end mb-4 px-1">
                <div>
                  <h3 className="text-headline-sm text-on-surface dark:text-gray-100">Weekly Schedule</h3>
                  <p className="text-body-md text-secondary dark:text-gray-400">Spring 2025 · All enrolled courses</p>
                </div>
                <button onClick={() => setTab('today')} className="text-primary dark:text-primary-fixed-dim font-bold text-sm hover:underline">← Today</button>
              </div>
              <div className="space-y-6">
                {DAYS.map(day => {
                  const daySlots = getAllSlotsForDay(courses, day);
                  const isToday = day === getTodayDayName();
                  return (
                    <div key={day}>
                      <div className={`flex items-center gap-3 mb-3 ${isToday ? 'text-primary dark:text-primary-fixed-dim' : 'text-secondary dark:text-gray-400'}`}>
                        <h4 className="text-label-md font-bold uppercase tracking-widest">{day}</h4>
                        {isToday && <span className="text-[10px] bg-primary dark:bg-primary-fixed-dim text-on-primary dark:text-on-primary-fixed font-black px-2 py-0.5 rounded-full uppercase">Today</span>}
                        <div className="flex-1 h-px bg-outline-variant dark:bg-gray-800" />
                      </div>
                      {daySlots.length === 0 ? (
                        <p className="text-body-md text-secondary dark:text-gray-500 pl-4 pb-2">No classes</p>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map((slot, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-start gap-4 hover:border-primary-fixed-dim dark:hover:border-primary-fixed-dim transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                              <div className="shrink-0 text-right min-w-[80px]">
                                <p className="text-label-sm text-primary dark:text-primary-fixed-dim font-bold">{slot.startLabel}</p>
                                <p className="text-label-sm text-secondary dark:text-gray-400">{slot.endLabel}</p>
                              </div>
                              <div className="w-px self-stretch bg-primary-fixed dark:bg-primary-container mx-1" />
                              <div className="flex flex-col min-w-0">
                                <h4 className="text-headline-sm text-on-surface dark:text-gray-100">{slot.course.course_name}</h4>
                                <p className="text-body-md text-secondary dark:text-gray-400">
                                  <span className="material-symbols-outlined text-sm align-middle mr-1">location_on</span>
                                  {slot.venue || 'TBA'} ·
                                  <span className="material-symbols-outlined text-sm align-middle mx-1">person</span>
                                  {slot.course.faculty || 'TBA'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pt-2 pb-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setTab('today')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl ${tab === 'today' ? 'text-primary dark:text-primary-fixed-dim bg-primary-fixed/20' : 'text-secondary dark:text-gray-400'}`}
        >
          <span className="material-symbols-outlined" style={tab === 'today' ? { fontVariationSettings: "'FILL' 1" } : {}}>dashboard</span>
          <span className="text-[11px] font-semibold">Today</span>
        </button>
        <button
          onClick={() => setTab('week')}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl ${tab === 'week' ? 'text-primary dark:text-primary-fixed-dim bg-primary-fixed/20' : 'text-secondary dark:text-gray-400'}`}
        >
          <span className="material-symbols-outlined" style={tab === 'week' ? { fontVariationSettings: "'FILL' 1" } : {}}>calendar_month</span>
          <span className="text-[11px] font-semibold">Schedule</span>
        </button>
        <button
          onClick={handleRequestNotif}
          className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl ${notifPermission === 'granted' ? 'text-primary dark:text-primary-fixed-dim' : 'text-secondary dark:text-gray-400'}`}
        >
          <span className="material-symbols-outlined" style={notifPermission === 'granted' ? { fontVariationSettings: "'FILL' 1" } : {}}>notifications_active</span>
          <span className="text-[11px] font-semibold">Alerts</span>
        </button>
        <button
          onClick={() => { localStorage.clear(); navigate('/'); }}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-secondary dark:text-gray-400 hover:text-error"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-[11px] font-semibold">Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
