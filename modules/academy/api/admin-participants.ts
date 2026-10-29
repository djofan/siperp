import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
export type ListAdminEnrollmentsResult = {
    items: {
        totalLessons: number;
        completedLessons: number;
        totalQuizzes: number;
        passedQuizzes: number;
        percent: number;
        isEligible: boolean;
        completedAt: Date | null;
        id: string;
        createdAt: Date;
        courseId: string;
        profileId: string;
        course: {
            isPublished: boolean;
            id: string;
            title: string;
        };
        profile: {
            id: string;
            user: {
                name: string;
                email: string;
                isActive: boolean;
            };
            nis: string | null;
        };
    }[];
    total: number;
    page: number;
    pages: number;
};
export async function listAdminEnrollments(search: string, program: string, requestedPage: number): Promise<ListAdminEnrollmentsResult> {
    return await apiRequest<{
        items: {
            totalLessons: number;
            completedLessons: number;
            totalQuizzes: number;
            passedQuizzes: number;
            percent: number;
            isEligible: boolean;
            completedAt: Date | null;
            id: string;
            createdAt: Date;
            courseId: string;
            profileId: string;
            course: {
                isPublished: boolean;
                id: string;
                title: string;
            };
            profile: {
                id: string;
                user: {
                    name: string;
                    email: string;
                    isActive: boolean;
                };
                nis: string | null;
            };
        }[];
        total: number;
        page: number;
        pages: number;
    }>(`academy/admin/enrollments?search=${encodeURIComponent(search)}&program=${encodeURIComponent(program)}&page=${requestedPage}`);
}
export type GetAdminEnrollmentResult = {
    record: {
        id: string;
        isEligible: boolean;
        completedAt: Date | null;
        certificateUrl: string | null;
    } | {
        id: string;
        isEligible: boolean;
        completedAt: Date | null;
        certificateUrl: string | null;
    } | null;
    lessons: {
        items: {
            id: string;
            title: string;
            lessonProgress: {
                completedAt: Date | null;
                completed: boolean;
            }[];
            chapter: {
                title: string;
            };
        }[] | {
            id: string;
            title: string;
            lessonProgress: {
                completedAt: Date | null;
                completed: boolean;
            }[];
            chapter: {
                title: string;
            };
        }[];
        page: number;
        pages: number;
        total: number;
    };
    quizzes: {
        items: {
            bestScore: number | null;
            passed: boolean;
            completedAttempts: number;
            id: string;
            title: string;
            chapter: {
                title: string;
            };
        }[];
        page: number;
        pages: number;
        total: number;
    };
    totalLessons: number;
    completedLessons: number;
    totalQuizzes: number;
    passedQuizzes: number;
    percent: number;
    isEligible: boolean;
    completedAt: Date | null;
    id: string;
    createdAt: Date;
    courseId: string;
    profileId: string;
    course: {
        isPublished: boolean;
        id: string;
        title: string;
    };
    profile: {
        id: string;
        user: {
            name: string;
            email: string;
            isActive: boolean;
        };
        nis: string | null;
    };
} | null;
export async function getAdminEnrollment(id: string, lessonPage: number, quizPage: number): Promise<GetAdminEnrollmentResult> {
    try {
        return await apiRequest<{
            record: {
                id: string;
                isEligible: boolean;
                completedAt: Date | null;
                certificateUrl: string | null;
            } | {
                id: string;
                isEligible: boolean;
                completedAt: Date | null;
                certificateUrl: string | null;
            } | null;
            lessons: {
                items: {
                    id: string;
                    title: string;
                    lessonProgress: {
                        completedAt: Date | null;
                        completed: boolean;
                    }[];
                    chapter: {
                        title: string;
                    };
                }[] | {
                    id: string;
                    title: string;
                    lessonProgress: {
                        completedAt: Date | null;
                        completed: boolean;
                    }[];
                    chapter: {
                        title: string;
                    };
                }[];
                page: number;
                pages: number;
                total: number;
            };
            quizzes: {
                items: {
                    bestScore: number | null;
                    passed: boolean;
                    completedAttempts: number;
                    id: string;
                    title: string;
                    chapter: {
                        title: string;
                    };
                }[];
                page: number;
                pages: number;
                total: number;
            };
            totalLessons: number;
            completedLessons: number;
            totalQuizzes: number;
            passedQuizzes: number;
            percent: number;
            isEligible: boolean;
            completedAt: Date | null;
            id: string;
            createdAt: Date;
            courseId: string;
            profileId: string;
            course: {
                isPublished: boolean;
                id: string;
                title: string;
            };
            profile: {
                id: string;
                user: {
                    name: string;
                    email: string;
                    isActive: boolean;
                };
                nis: string | null;
            };
        } | null>(`academy/admin/enrollments/${encodeURIComponent(id)}?lessonPage=${lessonPage}&quizPage=${quizPage}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type ListAdminCompletionsResult = {
    items: {
        current: {
            totalLessons: number;
            completedLessons: number;
            totalQuizzes: number;
            passedQuizzes: number;
            percent: number;
            isEligible: boolean;
            completedAt: Date | null;
            id: string;
            createdAt: Date;
            courseId: string;
            profileId: string;
            course: {
                isPublished: boolean;
                id: string;
                title: string;
            };
            profile: {
                id: string;
                user: {
                    name: string;
                    email: string;
                    isActive: boolean;
                };
                nis: string | null;
            };
        } | null;
        id: string;
        updatedAt: Date;
        courseId: string;
        profileId: string;
        course: {
            isPublished: boolean;
            id: string;
            title: string;
        };
        isEligible: boolean;
        completedAt: Date | null;
        certificateUrl: string | null;
        profile: {
            id: string;
            user: {
                name: string;
                email: string;
                isActive: boolean;
            };
            nis: string | null;
        };
    }[];
    total: number;
    page: number;
    pages: number;
};
export async function listAdminCompletions(search: string, program: string, requestedPage: number): Promise<ListAdminCompletionsResult> {
    return await apiRequest<{
        items: {
            current: {
                totalLessons: number;
                completedLessons: number;
                totalQuizzes: number;
                passedQuizzes: number;
                percent: number;
                isEligible: boolean;
                completedAt: Date | null;
                id: string;
                createdAt: Date;
                courseId: string;
                profileId: string;
                course: {
                    isPublished: boolean;
                    id: string;
                    title: string;
                };
                profile: {
                    id: string;
                    user: {
                        name: string;
                        email: string;
                        isActive: boolean;
                    };
                    nis: string | null;
                };
            } | null;
            id: string;
            updatedAt: Date;
            courseId: string;
            profileId: string;
            course: {
                isPublished: boolean;
                id: string;
                title: string;
            };
            isEligible: boolean;
            completedAt: Date | null;
            certificateUrl: string | null;
            profile: {
                id: string;
                user: {
                    name: string;
                    email: string;
                    isActive: boolean;
                };
                nis: string | null;
            };
        }[];
        total: number;
        page: number;
        pages: number;
    }>(`academy/admin/completions?search=${encodeURIComponent(search)}&program=${encodeURIComponent(program)}&page=${requestedPage}`);
}
export type GetAdminCompletionResult = {
    current: {
        totalLessons: number;
        completedLessons: number;
        totalQuizzes: number;
        passedQuizzes: number;
        percent: number;
        isEligible: boolean;
        completedAt: Date | null;
        id: string;
        createdAt: Date;
        courseId: string;
        profileId: string;
        course: {
            isPublished: boolean;
            id: string;
            title: string;
        };
        profile: {
            id: string;
            user: {
                name: string;
                email: string;
                isActive: boolean;
            };
            nis: string | null;
        };
    } | null;
    id: string;
    updatedAt: Date;
    courseId: string;
    profileId: string;
    course: {
        isPublished: boolean;
        id: string;
        title: string;
    };
    isEligible: boolean;
    completedAt: Date | null;
    certificateUrl: string | null;
    profile: {
        id: string;
        user: {
            name: string;
            email: string;
            isActive: boolean;
        };
        nis: string | null;
    };
} | null;
export async function getAdminCompletion(id: string): Promise<GetAdminCompletionResult> {
    try {
        return await apiRequest<{
            current: {
                totalLessons: number;
                completedLessons: number;
                totalQuizzes: number;
                passedQuizzes: number;
                percent: number;
                isEligible: boolean;
                completedAt: Date | null;
                id: string;
                createdAt: Date;
                courseId: string;
                profileId: string;
                course: {
                    isPublished: boolean;
                    id: string;
                    title: string;
                };
                profile: {
                    id: string;
                    user: {
                        name: string;
                        email: string;
                        isActive: boolean;
                    };
                    nis: string | null;
                };
            } | null;
            id: string;
            updatedAt: Date;
            courseId: string;
            profileId: string;
            course: {
                isPublished: boolean;
                id: string;
                title: string;
            };
            isEligible: boolean;
            completedAt: Date | null;
            certificateUrl: string | null;
            profile: {
                id: string;
                user: {
                    name: string;
                    email: string;
                    isActive: boolean;
                };
                nis: string | null;
            };
        } | null>(`academy/admin/completions/${encodeURIComponent(id)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type SyncAdminCompletionResult = {
    id: string;
};
export async function syncAdminCompletion(enrollmentId: string): Promise<SyncAdminCompletionResult> { return await apiRequest<SyncAdminCompletionResult>(`academy/admin/enrollments/${encodeURIComponent(enrollmentId)}/completion`, { method: "POST" }); }
export type SaveAdminCertificateResult = void;
export async function saveAdminCertificate(id: string, form: FormData): Promise<SaveAdminCertificateResult> { await apiRequest<SaveAdminCertificateResult>(`academy/admin/completions/${encodeURIComponent(id)}/certificate`, { method: "PUT", body: form }); }
export type DeleteAdminCompletionResult = void;
export async function deleteAdminCompletion(id: string): Promise<DeleteAdminCompletionResult> { await apiRequest<DeleteAdminCompletionResult>(`academy/admin/completions/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export type GetAdminSettingsResult = {
    maintenance: boolean;
    registered: boolean;
    active: boolean;
};
export async function getAdminSettings(): Promise<GetAdminSettingsResult> { return await apiRequest<GetAdminSettingsResult>("academy/admin/settings"); }
export type SaveAdminMaintenanceResult = void;
export async function saveAdminMaintenance(form: FormData): Promise<SaveAdminMaintenanceResult> { await apiRequest<SaveAdminMaintenanceResult>("academy/admin/settings/maintenance", { method: "PUT", body: form }); }
