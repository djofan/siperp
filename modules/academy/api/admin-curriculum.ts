import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import type * as Domain from "@/contracts/modules/academy";
export type CurriculumStatsResult = {
    courses: number;
    published: number;
    chapters: number;
    lessons: number;
};
export async function curriculumStats(): Promise<CurriculumStatsResult> { return await apiRequest<CurriculumStatsResult>("academy/admin/curriculum/stats"); }
export type ListAdminCoursesResult = {
    items: {
        isPublished: boolean;
        id: string;
        title: string;
        slug: string;
        order: number;
        _count: {
            chapters: number;
            enrollments: number;
        };
    }[] | {
        isPublished: boolean;
        id: string;
        title: string;
        slug: string;
        order: number;
        _count: {
            chapters: number;
            enrollments: number;
        };
    }[];
    page: number;
    pages: number;
    total: number;
};
export async function listAdminCourses(search: string, status: string, requestedPage: number): Promise<ListAdminCoursesResult> { return await apiRequest<ListAdminCoursesResult>(`academy/admin/courses?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}&page=${requestedPage}`); }
export type GetAdminCourseResult = ({
    chapters: {
        isPublished: boolean;
        id: string;
        title: string;
        order: number;
        _count: {
            lessons: number;
            quizzes: number;
        };
    }[];
} & {
    isPublished: boolean;
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string | null;
    thumbnailUrl: string | null;
    materialUrl: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    teacher: string;
    quota: number;
    durationDays: number;
    startsAt: Date | null;
    isSimulation: boolean;
    registrationOpen: boolean;
}) | ({
    chapters: {
        isPublished: boolean;
        id: string;
        title: string;
        order: number;
        _count: {
            lessons: number;
            quizzes: number;
        };
    }[];
} & {
    isPublished: boolean;
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    description: string | null;
    thumbnailUrl: string | null;
    materialUrl: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    teacher: string;
    quota: number;
    durationDays: number;
    startsAt: Date | null;
    isSimulation: boolean;
    registrationOpen: boolean;
}) | null;
export async function getAdminCourse(id: string): Promise<GetAdminCourseResult> {
    try {
        return await apiRequest<({
            chapters: {
                isPublished: boolean;
                id: string;
                title: string;
                order: number;
                _count: {
                    lessons: number;
                    quizzes: number;
                };
            }[];
        } & {
            isPublished: boolean;
            id: string;
            title: string;
            slug: string;
            shortDescription: string;
            description: string | null;
            thumbnailUrl: string | null;
            materialUrl: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            teacher: string;
            quota: number;
            durationDays: number;
            startsAt: Date | null;
            isSimulation: boolean;
            registrationOpen: boolean;
        }) | ({
            chapters: {
                isPublished: boolean;
                id: string;
                title: string;
                order: number;
                _count: {
                    lessons: number;
                    quizzes: number;
                };
            }[];
        } & {
            isPublished: boolean;
            id: string;
            title: string;
            slug: string;
            shortDescription: string;
            description: string | null;
            thumbnailUrl: string | null;
            materialUrl: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            teacher: string;
            quota: number;
            durationDays: number;
            startsAt: Date | null;
            isSimulation: boolean;
            registrationOpen: boolean;
        }) | null>(`academy/admin/courses/${encodeURIComponent(id)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type GetAdminChapterResult = ({
    course: {
        id: string;
        title: string;
    };
    lessons: {
        isPublished: boolean;
        id: string;
        title: string;
        order: number;
        _count: {
            attachments: number;
        };
        videoProvider: Domain.ZakatAcademyVideoProvider;
    }[];
    quizzes: {
        isPublished: boolean;
        id: string;
        title: string;
        _count: {
            questions: number;
        };
        isActive: boolean;
    }[];
} & {
    isPublished: boolean;
    id: string;
    title: string;
    slug: string;
    description: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    courseId: string;
}) | ({
    course: {
        id: string;
        title: string;
    };
    lessons: {
        isPublished: boolean;
        id: string;
        title: string;
        order: number;
        _count: {
            attachments: number;
        };
        videoProvider: Domain.ZakatAcademyVideoProvider;
    }[];
    quizzes: {
        isPublished: boolean;
        id: string;
        title: string;
        _count: {
            questions: number;
        };
        isActive: boolean;
    }[];
} & {
    isPublished: boolean;
    id: string;
    title: string;
    slug: string;
    description: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    courseId: string;
}) | null;
export async function getAdminChapter(courseId: string, id: string): Promise<GetAdminChapterResult> {
    try {
        return await apiRequest<({
            course: {
                id: string;
                title: string;
            };
            lessons: {
                isPublished: boolean;
                id: string;
                title: string;
                order: number;
                _count: {
                    attachments: number;
                };
                videoProvider: Domain.ZakatAcademyVideoProvider;
            }[];
            quizzes: {
                isPublished: boolean;
                id: string;
                title: string;
                _count: {
                    questions: number;
                };
                isActive: boolean;
            }[];
        } & {
            isPublished: boolean;
            id: string;
            title: string;
            slug: string;
            description: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            courseId: string;
        }) | ({
            course: {
                id: string;
                title: string;
            };
            lessons: {
                isPublished: boolean;
                id: string;
                title: string;
                order: number;
                _count: {
                    attachments: number;
                };
                videoProvider: Domain.ZakatAcademyVideoProvider;
            }[];
            quizzes: {
                isPublished: boolean;
                id: string;
                title: string;
                _count: {
                    questions: number;
                };
                isActive: boolean;
            }[];
        } & {
            isPublished: boolean;
            id: string;
            title: string;
            slug: string;
            description: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            courseId: string;
        }) | null>(`academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(id)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type GetAdminLessonResult = ({
    chapter: {
        id: string;
        title: string;
    };
    attachments: {
        id: string;
        title: string;
        createdAt: Date;
        lessonId: string;
        fileUrl: string;
        fileType: string | null;
        fileSize: number | null;
    }[];
} & {
    isPublished: boolean;
    id: string;
    title: string;
    slug: string;
    shortDescription: string | null;
    thumbnailUrl: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    chapterId: string;
    contentSummary: string | null;
    videoProvider: Domain.ZakatAcademyVideoProvider;
    videoUrl: string;
    releaseDay: number;
}) | ({
    chapter: {
        id: string;
        title: string;
    };
    attachments: {
        id: string;
        title: string;
        createdAt: Date;
        lessonId: string;
        fileUrl: string;
        fileType: string | null;
        fileSize: number | null;
    }[];
} & {
    isPublished: boolean;
    id: string;
    title: string;
    slug: string;
    shortDescription: string | null;
    thumbnailUrl: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    chapterId: string;
    contentSummary: string | null;
    videoProvider: Domain.ZakatAcademyVideoProvider;
    videoUrl: string;
    releaseDay: number;
}) | null;
export async function getAdminLesson(courseId: string, chapterId: string, id: string): Promise<GetAdminLessonResult> {
    try {
        return await apiRequest<({
            chapter: {
                id: string;
                title: string;
            };
            attachments: {
                id: string;
                title: string;
                createdAt: Date;
                lessonId: string;
                fileUrl: string;
                fileType: string | null;
                fileSize: number | null;
            }[];
        } & {
            isPublished: boolean;
            id: string;
            title: string;
            slug: string;
            shortDescription: string | null;
            thumbnailUrl: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            chapterId: string;
            contentSummary: string | null;
            videoProvider: Domain.ZakatAcademyVideoProvider;
            videoUrl: string;
            releaseDay: number;
        }) | ({
            chapter: {
                id: string;
                title: string;
            };
            attachments: {
                id: string;
                title: string;
                createdAt: Date;
                lessonId: string;
                fileUrl: string;
                fileType: string | null;
                fileSize: number | null;
            }[];
        } & {
            isPublished: boolean;
            id: string;
            title: string;
            slug: string;
            shortDescription: string | null;
            thumbnailUrl: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
            chapterId: string;
            contentSummary: string | null;
            videoProvider: Domain.ZakatAcademyVideoProvider;
            videoUrl: string;
            releaseDay: number;
        }) | null>(`academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(id)}`);
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 404)
            return null;
        throw error;
    }
}
export type SaveCourseResult = {
    id: string;
};
export async function saveCourse(id: string | null, form: FormData): Promise<SaveCourseResult> { return await apiRequest<SaveCourseResult>(id ? `academy/admin/courses/${encodeURIComponent(id)}` : "academy/admin/courses", { method: id ? "PUT" : "POST", body: form }); }
export type SaveChapterResult = {
    id: string;
};
export async function saveChapter(courseId: string, id: string | null, form: FormData): Promise<SaveChapterResult> { return await apiRequest<SaveChapterResult>(id ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(id)}` : `academy/admin/courses/${encodeURIComponent(courseId)}/chapters`, { method: id ? "PUT" : "POST", body: form }); }
export type SaveLessonResult = {
    id: string;
};
export async function saveLesson(courseId: string, chapterId: string, id: string | null, form: FormData): Promise<SaveLessonResult> { return await apiRequest<SaveLessonResult>(id ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(id)}` : `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons`, { method: id ? "PUT" : "POST", body: form }); }
export type SaveAttachmentResult = {
    id: string;
};
export async function saveAttachment(courseId: string, chapterId: string, lessonId: string, id: string | null, form: FormData): Promise<SaveAttachmentResult> { return await apiRequest<SaveAttachmentResult>(id ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(lessonId)}/attachments/${encodeURIComponent(id)}` : `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(lessonId)}/attachments`, { method: id ? "PUT" : "POST", body: form }); }
export type SetContentOrderResult = void;
export async function setContentOrder(courseId: string, chapterId: string, lessonId: string | null, order: number): Promise<SetContentOrderResult> { await apiRequest<SetContentOrderResult>(lessonId ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(lessonId)}/order` : `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/order`, { method: "PUT", body: JSON.stringify({ order }) }); }
export type DeleteContentResult = void;
export async function deleteContent(courseId: string, chapterId: string | null, lessonId: string | null): Promise<DeleteContentResult> { await apiRequest<DeleteContentResult>(lessonId && chapterId ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(lessonId)}` : chapterId ? `academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}` : `academy/admin/courses/${encodeURIComponent(courseId)}`, { method: "DELETE" }); }
export type DeleteAttachmentResult = void;
export async function deleteAttachment(courseId: string, chapterId: string, lessonId: string, id: string): Promise<DeleteAttachmentResult> { await apiRequest<DeleteAttachmentResult>(`academy/admin/courses/${encodeURIComponent(courseId)}/chapters/${encodeURIComponent(chapterId)}/lessons/${encodeURIComponent(lessonId)}/attachments/${encodeURIComponent(id)}`, { method: "DELETE" }); }
