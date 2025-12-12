// src/lib/jobs.ts

// Map to track background fetch jobs
export const jobStatusMap = new Map<
	string,
	{
		source: string;
		status: "queued" | "running" | "done" | "error";
		message?: string;
		createdAt: number;
	}
>();

export function setJobStatus(
	jobId: string,
	status: "queued" | "running" | "done" | "error",
	source: string,
	message?: string,
) {
	jobStatusMap.set(jobId, { status, source, message, createdAt: Date.now() });
}

export function getJobStatus(jobId: string) {
	return jobStatusMap.get(jobId);
}

// Cleanup completed jobs after a timeout
setInterval(
	() => {
		const now = Date.now();
		jobStatusMap.forEach((job, id) => {
			if (job.status === "done" || job.status === "error") {
				// could add timestamp to track age if desired
				jobStatusMap.delete(id);
			}
		});
	},
	1000 * 60 * 10,
); // every 10 minutes
