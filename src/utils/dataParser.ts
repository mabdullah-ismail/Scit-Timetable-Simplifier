import courseData from '../data/course_offerings_spring2025.json';

export interface TimetableSlot {
  time: string;
  venue: string;
}

export interface Course {
  course_code: string;
  course_name: string;
  credit_hours: number;
  section: string;
  semester: string;
  prerequisite_code: string | null;
  prerequisite_name: string | null;
  faculty: string;
  timetable: TimetableSlot[];
  isElective?: boolean;
}

export interface Batch {
  batch: string;
  courses: Course[];
}

export const getFilteredBatches = (): Batch[] => {
  return courseData.filter((b: any) => {
    const name = b.batch.toLowerCase();
    // Explicitly include only Computer Science and Software Engineering
    const isCS = name.includes('computer science');
    const isSE = name.includes('software engineering');
    // Explicitly exclude Artificial Intelligence and Management & Business Computing
    const isAI = name.includes('artificial intelligence');
    const isMBC = name.includes('management') || name.includes('business computing');
    return (isCS || isSE) && !isAI && !isMBC;
  }) as Batch[];
};

export const getUniqueBatchNames = (): string[] => {
  return getFilteredBatches().map(b => b.batch);
};

export const getSectionsForBatch = (batchName: string): string[] => {
  const batch = getFilteredBatches().find(b => b.batch === batchName);
  if (!batch) return [];
  
  const sections = new Set<string>();
  batch.courses.forEach(c => {
    if (c.section) {
      sections.add(c.section.trim());
    }
  });
  return Array.from(sections).sort();
};

export const getElectivesForBatch = (batchName: string): Course[] => {
  const batch = getFilteredBatches().find(b => b.batch === batchName);
  if (!batch) return [];

  // Collect all electives from ALL sections (any student can pick any elective)
  // Deduplicate by course_code so the same elective offered in multiple sections appears once
  const seen = new Set<string>();
  const electives: Course[] = [];
  batch.courses.forEach(c => {
    if (c.course_name.toLowerCase().includes('elective') && !seen.has(c.course_code)) {
      seen.add(c.course_code);
      electives.push(c);
    }
  });
  return electives;
};

export const getCoreCoursesForBatchAndSection = (batchName: string, section: string): Course[] => {
  const batch = getFilteredBatches().find(b => b.batch === batchName);
  if (!batch) return [];

  return batch.courses.filter(c => 
    c.section === section && 
    !c.course_name.toLowerCase().includes('elective')
  );
};
