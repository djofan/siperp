import type * as Domain from "@/lib/domain";
export type AcademyPage1 = {
    people: {
        id: string;
        nis: string | null;
        phone: string | null;
        address: string | null;
        gender: Domain.ZakatAcademyGender | null;
        user: {
            name: string;
            isActive: boolean;
        };
        enrollments: {
            course: {
                title: string;
            };
        }[];
    }[] | {
        id: string;
        nis: string | null;
        phone: string | null;
        address: string | null;
        gender: Domain.ZakatAcademyGender | null;
        user: {
            name: string;
            isActive: boolean;
        };
        enrollments: {
            course: {
                title: string;
            };
        }[];
    }[];
    total: number;
    counts: ({gender: Domain.ZakatAcademyGender | null} & {
        _count: {
            _all: number;
        };
    })[];
    courses: ({
        _count: {
            enrollments: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
        title: string;
        shortDescription: string;
        thumbnailUrl: string | null;
        materialUrl: string | null;
        isPublished: boolean;
        order: number;
        teacher: string;
        quota: number;
        durationDays: number;
        startsAt: Date | null;
        isSimulation: boolean;
        registrationOpen: boolean;
    })[] | ({
        _count: {
            enrollments: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
        title: string;
        shortDescription: string;
        thumbnailUrl: string | null;
        materialUrl: string | null;
        isPublished: boolean;
        order: number;
        teacher: string;
        quota: number;
        durationDays: number;
        startsAt: Date | null;
        isSimulation: boolean;
        registrationOpen: boolean;
    })[];
};
export type AcademyPage2 = {
    courses: ({
        _count: {
            enrollments: number;
            completionRecords: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
        title: string;
        shortDescription: string;
        thumbnailUrl: string | null;
        materialUrl: string | null;
        isPublished: boolean;
        order: number;
        teacher: string;
        quota: number;
        durationDays: number;
        startsAt: Date | null;
        isSimulation: boolean;
        registrationOpen: boolean;
    })[] | ({
        _count: {
            enrollments: number;
            completionRecords: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        slug: string;
        title: string;
        shortDescription: string;
        thumbnailUrl: string | null;
        materialUrl: string | null;
        isPublished: boolean;
        order: number;
        teacher: string;
        quota: number;
        durationDays: number;
        startsAt: Date | null;
        isSimulation: boolean;
        registrationOpen: boolean;
    })[];
};
export type AcademyPage3 = {
    person: ({
        user: {
            name: string;
        };
    } & {
        id: string;
        userId: string;
        nis: string | null;
        phone: string | null;
        address: string | null;
        gender: Domain.ZakatAcademyGender | null;
        image: string | null;
        legacyCertificateUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        mustChangePassword: boolean;
        deletedAt: Date | null;
    }) | ({
        user: {
            name: string;
        };
    } & {
        id: string;
        userId: string;
        nis: string | null;
        phone: string | null;
        address: string | null;
        gender: Domain.ZakatAcademyGender | null;
        image: string | null;
        legacyCertificateUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        mustChangePassword: boolean;
        deletedAt: Date | null;
    }) | null;
};
export type AcademyPage4 = {
    notes: {
        id: string;
        updatedAt: Date;
        content: string;
        lesson: {
            slug: string;
            title: string;
            chapter: {
                course: {
                    slug: string;
                    title: string;
                };
            };
        };
    }[] | {
        id: string;
        updatedAt: Date;
        content: string;
        lesson: {
            slug: string;
            title: string;
            chapter: {
                course: {
                    slug: string;
                    title: string;
                };
            };
        };
    }[];
};
export type AcademyPage5 = {
    enrollments: {
        course: {
            id: string;
            title: string;
            sessions: {
                id: string;
                title: string;
                startsAt: Date;
                courseId: string;
                joinUrl: string;
            }[];
        };
    }[] | {
        course: {
            id: string;
            title: string;
            sessions: {
                id: string;
                title: string;
                startsAt: Date;
                courseId: string;
                joinUrl: string;
            }[];
        };
    }[];
    questions: {
        id: string;
        createdAt: Date;
        profileId: string;
        courseId: string;
        question: string;
        answer: string | null;
        answeredAt: Date | null;
    }[] | {
        id: string;
        createdAt: Date;
        profileId: string;
        courseId: string;
        question: string;
        answer: string | null;
        answeredAt: Date | null;
    }[];
};
export type AcademyPage6 = {
    records: {
        courseId: string;
        certificateUrl: string | null;
    }[];
};
export type AcademyPage7 = {
    material: {
        materialUrl: string | null;
    } | null;
};
export type AcademyPage8 = {
    lesson: {
        id: string;
        lessonProgress: {
            completed: boolean;
            audioPosition: number;
            audioSource: string | null;
        }[];
        title: string;
        contentSummary: string | null;
        videoProvider: Domain.ZakatAcademyVideoProvider;
        videoUrl: string;
        releaseDay: number;
        attachments: {
            id: string;
            title: string;
            fileUrl: string;
        }[];
    } | {
        id: string;
        lessonProgress: {
            completed: boolean;
            audioPosition: number;
            audioSource: string | null;
        }[];
        title: string;
        contentSummary: string | null;
        videoProvider: Domain.ZakatAcademyVideoProvider;
        videoUrl: string;
        releaseDay: number;
        attachments: {
            id: string;
            title: string;
            fileUrl: string;
        }[];
    } | null;
    note: {
        content: string;
    } | {
        content: string;
    } | null;
};
export type AcademyPage9 = {
    materials: number;
    exams: number;
    questions: number;
    participants: number;
};
export type AcademyPage10 = {
    chapters: {
        id: string;
        title: string;
        course: {
            title: string;
        };
        lessons: {
            id: string;
            title: string;
            isPublished: boolean;
            order: number;
            contentSummary: string | null;
            videoUrl: string;
            releaseDay: number;
        }[];
    }[] | {
        id: string;
        title: string;
        course: {
            title: string;
        };
        lessons: {
            id: string;
            title: string;
            isPublished: boolean;
            order: number;
            contentSummary: string | null;
            videoUrl: string;
            releaseDay: number;
        }[];
    }[];
};
export type AcademyPage11 = {
    chapters: {
        id: string;
        title: string;
        course: {
            title: string;
        };
        quizzes: {
            id: string;
            _count: {
                questions: number;
            };
            title: string;
            isPublished: boolean;
            releaseDay: number;
        }[];
    }[] | {
        id: string;
        title: string;
        course: {
            title: string;
        };
        quizzes: {
            id: string;
            _count: {
                questions: number;
            };
            title: string;
            isPublished: boolean;
            releaseDay: number;
        }[];
    }[];
};
export type AcademyPage12 = {
    scope: {
        chapterId: string;
        chapter: {
            courseId: string;
        };
    } | {
        chapterId: string;
        chapter: {
            courseId: string;
        };
    } | null;
    quiz: {
        isPublished: boolean;
        id: string;
        title: string;
        description: string | null;
        _count: {
            attempts: number;
        };
        releaseDay: number;
        isActive: boolean;
        passingScore: number;
        quizDate: Date | null;
        timeLimitMinutes: number;
        allowRetake: boolean;
        kind: import("@/lib/domain").AcademyQuizKind;
        closesAt: Date | null;
        questions: {
            id: string;
            order: number;
            question: string;
            type: import("@/lib/domain").AcademyQuestionType;
            weight: number;
            explanation: string | null;
            options: {
                id: string;
                isCorrect: boolean;
                label: string;
            }[];
        }[];
        chapter: {
            title: string;
        };
    } | {
        isPublished: boolean;
        id: string;
        title: string;
        description: string | null;
        _count: {
            attempts: number;
        };
        releaseDay: number;
        isActive: boolean;
        passingScore: number;
        quizDate: Date | null;
        timeLimitMinutes: number;
        allowRetake: boolean;
        kind: import("@/lib/domain").AcademyQuizKind;
        closesAt: Date | null;
        questions: {
            id: string;
            order: number;
            question: string;
            type: import("@/lib/domain").AcademyQuestionType;
            weight: number;
            explanation: string | null;
            options: {
                id: string;
                isCorrect: boolean;
                label: string;
            }[];
        }[];
        chapter: {
            title: string;
        };
    } | null;
};
export type AcademyPage13 = {
    questions: {
        id: string;
        profile: {
            user: {
                name: string;
            };
        };
        course: {
            title: string;
        };
        question: string;
        answer: string | null;
    }[] | {
        id: string;
        profile: {
            user: {
                name: string;
            };
        };
        course: {
            title: string;
        };
        question: string;
        answer: string | null;
    }[];
};
export type AcademyPage14 = {
    courses: {
        id: string;
        title: string;
        quizzes: { id: string; title: string }[];
        people: {
            profileId: string;
            name: string;
            nis: string | null;
            grade: {
                best: Record<string, number>;
                means: Record<Domain.AcademyQuizKind, number>;
                score: number;
                complete: boolean;
            };
        }[];
    }[];
};
export type AcademyPage15 = {
    people: {
        pending: number;
        missed: number;
        low: number;
        id: string;
        profileId: string;
        courseId: string;
        profile: {
            user: {
                name: string;
            };
        };
        course: {
            title: string;
            startsAt: Date | null;
        };
    }[];
};
