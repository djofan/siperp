import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/lib/domain";
export type ListPublicCoursesResult = {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    thumbnailUrl: string | null;
    chapters: {
        _count: {
            lessons: number;
        };
    }[];
}[] | {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    thumbnailUrl: string | null;
    chapters: {
        _count: {
            lessons: number;
        };
    }[];
}[];
export async function listPublicCourses(search = "", take?: number): Promise<ListPublicCoursesResult> {
    return await apiRequest<{
        id: string;
        title: string;
        slug: string;
        shortDescription: string;
        thumbnailUrl: string | null;
        chapters: {
            _count: {
                lessons: number;
            };
        }[];
    }[] | {
        id: string;
        title: string;
        slug: string;
        shortDescription: string;
        thumbnailUrl: string | null;
        chapters: {
            _count: {
                lessons: number;
            };
        }[];
    }[]>(`academy/courses?search=${encodeURIComponent(search)}${take ? "&take=" + take : ""}`);
}
export type GetPublicCourseResult = {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string | null;
    thumbnailUrl: string | null;
    teacher: string;
    quota: number;
    durationDays: number;
    startsAt: Date | null;
    isSimulation: boolean;
    chapters: {
        id: string;
        title: string;
        description: string | null;
        lessons: {
            id: string;
            title: string;
            slug: string;
            releaseDay: number;
        }[];
        quizzes: {
            id: string;
            title: string;
        }[];
    }[];
    _count: {
        enrollments: number;
    };
} | {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string | null;
    thumbnailUrl: string | null;
    teacher: string;
    quota: number;
    durationDays: number;
    startsAt: Date | null;
    isSimulation: boolean;
    chapters: {
        id: string;
        title: string;
        description: string | null;
        lessons: {
            id: string;
            title: string;
            slug: string;
            releaseDay: number;
        }[];
        quizzes: {
            id: string;
            title: string;
        }[];
    }[];
    _count: {
        enrollments: number;
    };
} | null;
export async function getPublicCourse(slug: string): Promise<GetPublicCourseResult> {
    try {
        return await apiRequest<{
            id: string;
            title: string;
            slug: string;
            shortDescription: string;
            description: string | null;
            thumbnailUrl: string | null;
            teacher: string;
            quota: number;
            durationDays: number;
            startsAt: Date | null;
            isSimulation: boolean;
            chapters: {
                id: string;
                title: string;
                description: string | null;
                lessons: {
                    id: string;
                    title: string;
                    slug: string;
                    releaseDay: number;
                }[];
                quizzes: {
                    id: string;
                    title: string;
                }[];
            }[];
            _count: {
                enrollments: number;
            };
        } | {
            id: string;
            title: string;
            slug: string;
            shortDescription: string;
            description: string | null;
            thumbnailUrl: string | null;
            teacher: string;
            quota: number;
            durationDays: number;
            startsAt: Date | null;
            isSimulation: boolean;
            chapters: {
                id: string;
                title: string;
                description: string | null;
                lessons: {
                    id: string;
                    title: string;
                    slug: string;
                    releaseDay: number;
                }[];
                quizzes: {
                    id: string;
                    title: string;
                }[];
            }[];
            _count: {
                enrollments: number;
            };
        } | null>(`academy/courses/by-slug/${encodeURIComponent(slug)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type GetEnrollmentResult = {
    id: string;
    createdAt: Date;
    courseId: string;
    profileId: string;
    groupJoinedAt: Date | null;
} | null;
export async function getEnrollment(profileId: string | undefined, courseId: string): Promise<GetEnrollmentResult> {
    if (!profileId)
        return null;
    try {
        return await apiRequest<{
            id: string;
            createdAt: Date;
            courseId: string;
            profileId: string;
            groupJoinedAt: Date | null;
        } | null>(`academy/enrollments/course/${encodeURIComponent(courseId)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type GetLearningOverviewResult = {
    id: string;
    title: string;
    slug: string;
    enrolledAt: Date;
    totalLessons: number;
    completedLessons: number;
    totalQuizzes: number;
    passedQuizzes: number;
    percent: number;
    isEligible: boolean;
    grading: {
        means: {
            DAILY: number;
            WEEKLY: number;
            FINAL: number;
        };
        score: number;
        complete: boolean;
    };
    completedAt: Date | null;
}[];
export async function getLearningOverview(_profileId: string): Promise<GetLearningOverviewResult> {
    return await apiRequest<{
        id: string;
        title: string;
        slug: string;
        enrolledAt: Date;
        totalLessons: number;
        completedLessons: number;
        totalQuizzes: number;
        passedQuizzes: number;
        percent: number;
        isEligible: boolean;
        grading: {
            means: {
                DAILY: number;
                WEEKLY: number;
                FINAL: number;
            };
            score: number;
            complete: boolean;
        };
        completedAt: Date | null;
    }[]>("academy/learning/overview");
}
export type ListParticipantQuizzesResult = {
    id: string;
    title: string;
    _count: {
        questions: number;
    };
    releaseDay: number;
    isActive: boolean;
    passingScore: number;
    quizDate: Date | null;
    timeLimitMinutes: number;
    allowRetake: boolean;
    kind: Domain.AcademyQuizKind;
    closesAt: Date | null;
    chapter: {
        title: string;
        course: {
            startsAt: Date | null;
        };
    };
    attempts: {
        id: string;
        score: number | null;
        attemptNumber: number;
        passed: boolean | null;
        isCompleted: boolean;
    }[];
}[] | {
    id: string;
    title: string;
    _count: {
        questions: number;
    };
    releaseDay: number;
    isActive: boolean;
    passingScore: number;
    quizDate: Date | null;
    timeLimitMinutes: number;
    allowRetake: boolean;
    kind: Domain.AcademyQuizKind;
    closesAt: Date | null;
    chapter: {
        title: string;
        course: {
            startsAt: Date | null;
        };
    };
    attempts: {
        id: string;
        score: number | null;
        attemptNumber: number;
        passed: boolean | null;
        isCompleted: boolean;
    }[];
}[];
export async function listParticipantQuizzes(_profileId: string): Promise<ListParticipantQuizzesResult> {
    return await apiRequest<{
        id: string;
        title: string;
        _count: {
            questions: number;
        };
        releaseDay: number;
        isActive: boolean;
        passingScore: number;
        quizDate: Date | null;
        timeLimitMinutes: number;
        allowRetake: boolean;
        kind: Domain.AcademyQuizKind;
        closesAt: Date | null;
        chapter: {
            title: string;
            course: {
                startsAt: Date | null;
            };
        };
        attempts: {
            id: string;
            score: number | null;
            attemptNumber: number;
            passed: boolean | null;
            isCompleted: boolean;
        }[];
    }[] | {
        id: string;
        title: string;
        _count: {
            questions: number;
        };
        releaseDay: number;
        isActive: boolean;
        passingScore: number;
        quizDate: Date | null;
        timeLimitMinutes: number;
        allowRetake: boolean;
        kind: Domain.AcademyQuizKind;
        closesAt: Date | null;
        chapter: {
            title: string;
            course: {
                startsAt: Date | null;
            };
        };
        attempts: {
            id: string;
            score: number | null;
            attemptNumber: number;
            passed: boolean | null;
            isCompleted: boolean;
        }[];
    }[]>("academy/learning/quizzes");
}
export type GetLeaderboardResult = {
    id: string;
    name: string;
    total: number;
    average: number;
}[];
export async function getLeaderboard(): Promise<GetLeaderboardResult> { return await apiRequest<GetLeaderboardResult>("academy/leaderboard"); }
export type GetOwnRankingsResult = {
    courseId: string;
    title: string;
    rank: number | null;
    total: number;
    score: number;
    complete: boolean;
}[];
export async function getOwnRankings(_profileId: string): Promise<GetOwnRankingsResult> {
    return await apiRequest<{
        courseId: string;
        title: string;
        rank: number | null;
        total: number;
        score: number;
        complete: boolean;
    }[]>("academy/learning/rankings");
}
