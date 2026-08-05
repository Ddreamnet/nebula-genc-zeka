"use client";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Topic } from "@/lib/admin/types";

interface UseTopicsCrudOptions {
  adminUserId: string | undefined;
  selectedTeacherStudents: Array<{ id: string; student_id: string; group_id?: string | null }> | undefined;
  studentTopics: Map<string, Topic[]>;
  fetchStudentTopics: (studentUserId: string, studentId: string) => Promise<void>;
}

/**
 * Topics/resources have no shared identity across students by default — a
 * teacher authoring a topic "for the group" needs it mirrored into both
 * members' independent rows, linked by a shared group_link_id so the
 * teacher panel's group view (and the group-cascading completion RPC) can
 * treat them as one logical item. This mirroring is admin-authored CRUD
 * (low frequency, human-supervised) so it's done as sequential direct
 * writes rather than a single-transaction RPC.
 */
export function useTopicsCrud({ adminUserId, selectedTeacherStudents, studentTopics, fetchStudentTopics }: UseTopicsCrudOptions) {
  const supabase = createClient();

  function findGroupmate(studentRecordId: string) {
    const student = selectedTeacherStudents?.find((s) => s.id === studentRecordId);
    if (!student?.group_id) return undefined;
    return selectedTeacherStudents?.find((s) => s.id !== studentRecordId && s.group_id === student.group_id);
  }

  function findTopicOwner(topicId: string): string | undefined {
    return Array.from(studentTopics.entries()).find(([, ts]) => ts.some((t) => t.id === topicId))?.[0];
  }

  async function refetchStudent(studentRecordId: string | undefined) {
    if (!studentRecordId) return;
    const student = selectedTeacherStudents?.find((s) => s.id === studentRecordId);
    if (student) await fetchStudentTopics(student.student_id, studentRecordId);
  }

  async function handleAddTopic(title: string, description: string, selectedStudentForTopic: string | null) {
    if (!selectedStudentForTopic || !adminUserId) return;
    try {
      const student = selectedTeacherStudents?.find((s) => s.id === selectedStudentForTopic);
      if (!student) return;

      const groupmate = findGroupmate(selectedStudentForTopic);
      const groupLinkId = groupmate ? crypto.randomUUID() : null;

      const topics = studentTopics.get(selectedStudentForTopic) ?? [];
      const nextOrderIndex = topics.length > 0 ? Math.max(...topics.map((t) => t.order_index)) + 1 : 0;

      const { error } = await supabase.from("topics").insert({
        teacher_id: adminUserId,
        student_id: student.student_id,
        title,
        description: description || null,
        order_index: nextOrderIndex,
        group_link_id: groupLinkId,
      });
      if (error) throw error;

      if (groupmate && groupLinkId) {
        const mateTopics = studentTopics.get(groupmate.id) ?? [];
        const mateNextOrderIndex = mateTopics.length > 0 ? Math.max(...mateTopics.map((t) => t.order_index)) + 1 : 0;
        const { error: mateError } = await supabase.from("topics").insert({
          teacher_id: adminUserId,
          student_id: groupmate.student_id,
          title,
          description: description || null,
          order_index: mateNextOrderIndex,
          group_link_id: groupLinkId,
        });
        if (mateError) throw mateError;
      }

      toast.success("Konu başarıyla oluşturuldu");
      await refetchStudent(selectedStudentForTopic);
      await refetchStudent(groupmate?.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konu oluşturulamadı");
    }
  }

  async function handleAddResource(
    title: string,
    description: string,
    resourceType: string,
    resourceUrl: string,
    selectedTopicForResource: string | null,
  ) {
    if (!selectedTopicForResource) return;
    try {
      const allTopics = Array.from(studentTopics.values()).flat();
      const topic = allTopics.find((t) => t.id === selectedTopicForResource);
      const ownerStudentRecordId = findTopicOwner(selectedTopicForResource);
      if (!topic || !ownerStudentRecordId) return;

      const nextOrderIndex = topic.resources.length > 0 ? Math.max(...topic.resources.map((r) => r.order_index)) + 1 : 0;

      const siblingTopic = topic.group_link_id
        ? allTopics.find((t) => t.group_link_id === topic.group_link_id && t.id !== topic.id)
        : undefined;
      const resourceGroupLinkId = siblingTopic ? crypto.randomUUID() : null;

      const { error } = await supabase.from("resources").insert({
        topic_id: selectedTopicForResource,
        title,
        description: description || null,
        resource_type: resourceType,
        resource_url: resourceUrl,
        order_index: nextOrderIndex,
        group_link_id: resourceGroupLinkId,
      });
      if (error) throw error;

      if (siblingTopic && resourceGroupLinkId) {
        const siblingNextOrderIndex =
          siblingTopic.resources.length > 0 ? Math.max(...siblingTopic.resources.map((r) => r.order_index)) + 1 : 0;
        const { error: mateError } = await supabase.from("resources").insert({
          topic_id: siblingTopic.id,
          title,
          description: description || null,
          resource_type: resourceType,
          resource_url: resourceUrl,
          order_index: siblingNextOrderIndex,
          group_link_id: resourceGroupLinkId,
        });
        if (mateError) throw mateError;
      }

      toast.success("Kaynak başarıyla eklendi");
      await refetchStudent(ownerStudentRecordId);
      if (siblingTopic) await refetchStudent(findTopicOwner(siblingTopic.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak eklenemedi");
    }
  }

  async function handleEditTopic(id: string, title: string, description: string) {
    try {
      const allTopics = Array.from(studentTopics.values()).flat();
      const topic = allTopics.find((t) => t.id === id);
      const sibling = topic?.group_link_id ? allTopics.find((t) => t.group_link_id === topic.group_link_id && t.id !== id) : undefined;

      const { error } = await supabase.from("topics").update({ title, description: description || null }).eq("id", id);
      if (error) throw error;

      if (sibling) {
        const { error: mateError } = await supabase.from("topics").update({ title, description: description || null }).eq("id", sibling.id);
        if (mateError) throw mateError;
      }

      toast.success("Konu güncellendi");
      await refetchStudent(findTopicOwner(id));
      if (sibling) await refetchStudent(findTopicOwner(sibling.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konu güncellenemedi");
    }
  }

  async function handleEditResource(id: string, title: string, description: string, resourceType: string, resourceUrl: string) {
    try {
      const allTopics = Array.from(studentTopics.values()).flat();
      const parentTopic = allTopics.find((t) => t.resources.some((r) => r.id === id));
      const resource = parentTopic?.resources.find((r) => r.id === id);
      const siblingResourceId = resource?.group_link_id
        ? allTopics.flatMap((t) => t.resources).find((r) => r.group_link_id === resource.group_link_id && r.id !== id)?.id
        : undefined;

      const { error } = await supabase
        .from("resources")
        .update({ title, description: description || null, resource_type: resourceType, resource_url: resourceUrl })
        .eq("id", id);
      if (error) throw error;

      if (siblingResourceId) {
        const { error: mateError } = await supabase
          .from("resources")
          .update({ title, description: description || null, resource_type: resourceType, resource_url: resourceUrl })
          .eq("id", siblingResourceId);
        if (mateError) throw mateError;
      }

      toast.success("Kaynak güncellendi");
      await refetchStudent(findTopicOwner(parentTopic?.id ?? ""));
      if (siblingResourceId) {
        const siblingTopic = allTopics.find((t) => t.resources.some((r) => r.id === siblingResourceId));
        if (siblingTopic) await refetchStudent(findTopicOwner(siblingTopic.id));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak güncellenemedi");
    }
  }

  async function handleDeleteTopic(topicId: string, studentId: string, studentUserId: string) {
    try {
      const allTopics = Array.from(studentTopics.values()).flat();
      const topic = allTopics.find((t) => t.id === topicId);
      const sibling = topic?.group_link_id ? allTopics.find((t) => t.group_link_id === topic.group_link_id && t.id !== topicId) : undefined;
      const siblingOwnerId = sibling ? findTopicOwner(sibling.id) : undefined;

      const { error } = await supabase.from("topics").delete().eq("id", topicId);
      if (error) throw error;

      if (sibling) {
        const { error: mateError } = await supabase.from("topics").delete().eq("id", sibling.id);
        if (mateError) throw mateError;
      }

      toast.success("Konu silindi");
      await fetchStudentTopics(studentUserId, studentId);
      await refetchStudent(siblingOwnerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Konu silinemedi");
    }
  }

  async function handleDeleteResource(resourceId: string, studentId: string, studentUserId: string) {
    try {
      const allTopics = Array.from(studentTopics.values()).flat();
      const parentTopic = allTopics.find((t) => t.resources.some((r) => r.id === resourceId));
      const resource = parentTopic?.resources.find((r) => r.id === resourceId);
      const siblingResourceId = resource?.group_link_id
        ? allTopics.flatMap((t) => t.resources).find((r) => r.group_link_id === resource.group_link_id && r.id !== resourceId)?.id
        : undefined;
      const siblingTopic = siblingResourceId ? allTopics.find((t) => t.resources.some((r) => r.id === siblingResourceId)) : undefined;
      const siblingOwnerId = siblingTopic ? findTopicOwner(siblingTopic.id) : undefined;

      const { error } = await supabase.from("resources").delete().eq("id", resourceId);
      if (error) throw error;

      if (siblingResourceId) {
        const { error: mateError } = await supabase.from("resources").delete().eq("id", siblingResourceId);
        if (mateError) throw mateError;
      }

      toast.success("Kaynak silindi");
      await fetchStudentTopics(studentUserId, studentId);
      await refetchStudent(siblingOwnerId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kaynak silinemedi");
    }
  }

  return {
    handleAddTopic,
    handleAddResource,
    handleEditTopic,
    handleEditResource,
    handleDeleteTopic,
    handleDeleteResource,
  };
}
