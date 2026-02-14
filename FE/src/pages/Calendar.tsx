import { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

interface CalendarEvent {
    id: string;
    title: string;
    date: number;
    color: string;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
}

export default function Calendar() {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    // Sample work schedule events
    const [events] = useState<CalendarEvent[]>([
        { id: "1", title: "Team Standup", date: 3, color: "bg-brand-500" },
        { id: "2", title: "Sprint Review", date: 7, color: "bg-success-500" },
        { id: "3", title: "Agent Deploy", date: 12, color: "bg-warning-500" },
        { id: "4", title: "Code Review", date: 15, color: "bg-brand-500" },
        { id: "5", title: "Release v2.0", date: 20, color: "bg-error-500" },
        { id: "6", title: "Retrospective", date: 24, color: "bg-success-500" },
        { id: "7", title: "Planning", date: 28, color: "bg-brand-500" },
    ]);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const isToday = (day: number) =>
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

    const getEventsForDay = (day: number) =>
        events.filter((e) => e.date === day);

    // Build calendar grid
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <>
            <PageMeta title="Work Calendar | IT Heroes" description="Work schedule calendar for IT Heroes" />
            <PageBreadcrumb pageTitle="Work Calendar" />

            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={prevMonth}
                            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button
                            onClick={nextMonth}
                            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            {MONTHS[currentMonth]} {currentYear}
                        </h2>
                    </div>
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 transition-colors"
                    >
                        Today
                    </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
                    {DAYS.map((day) => (
                        <div
                            key={day}
                            className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                    {cells.map((day, i) => {
                        const dayEvents = day ? getEventsForDay(day) : [];
                        return (
                            <div
                                key={i}
                                className={`min-h-[100px] border-b border-r border-gray-100 p-2 dark:border-gray-800 ${day === null
                                    ? "bg-gray-50/50 dark:bg-white/[0.01]"
                                    : "hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                                    } ${i % 7 === 6 ? "border-r-0" : ""}`}
                            >
                                {day !== null && (
                                    <>
                                        <span
                                            className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${isToday(day)
                                                ? "bg-brand-500 text-white font-bold"
                                                : "text-gray-700 dark:text-gray-300"
                                                }`}
                                        >
                                            {day}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                            {dayEvents.map((evt) => (
                                                <div
                                                    key={evt.id}
                                                    className={`${evt.color} truncate rounded px-1.5 py-0.5 text-xs font-medium text-white`}
                                                >
                                                    {evt.title}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
