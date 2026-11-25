import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CandidateProfile, Job, MatchResult } from "@schemas";
import { getJobs, postMatch } from "./api";
import { clearProfile, loadProfile, saveProfile } from "./profile";

type Status = "loading" | "ready" | "error";

interface DataValue {
  jobs: Job[];
  jobsStatus: Status;
  fetchedAt: string | null;
  profile: CandidateProfile | null;
  matches: ReadonlyMap<string, MatchResult>;
  matchStatus: Status;
  setProfile(p: CandidateProfile): void;
  deleteMyData(): void;
  reloadJobs(): void;
}

const Ctx = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsStatus, setJobsStatus] = useState<Status>("loading");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [profile, setProfileState] = useState<CandidateProfile | null>(() => loadProfile());
  const [matches, setMatches] = useState<ReadonlyMap<string, MatchResult>>(new Map());
  const [matchStatus, setMatchStatus] = useState<Status>("ready");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setJobsStatus("loading");
    getJobs(ctl.signal)
      .then((r) => {
        setJobs(r.jobs);
        setFetchedAt(r.fetchedAt);
        setJobsStatus("ready");
      })
      .catch(() => !ctl.signal.aborted && setJobsStatus("error"));
    return () => ctl.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!profile || jobs.length === 0) {
      setMatches(new Map());
      return;
    }
    const ctl = new AbortController();
    setMatchStatus("loading");
    postMatch(profile, jobs.map((j) => j.id).slice(0, 500), ctl.signal)
      .then((results) => {
        setMatches(new Map(results.map((r) => [r.jobId, r])));
        setMatchStatus("ready");
      })
      .catch(() => !ctl.signal.aborted && setMatchStatus("error"));
    return () => ctl.abort();
  }, [profile, jobs]);

  const setProfile = useCallback((p: CandidateProfile) => {
    saveProfile(p);
    setProfileState(p);
  }, []);
  const deleteMyData = useCallback(() => {
    clearProfile();
    setProfileState(null);
    setMatches(new Map());
  }, []);
  const reloadJobs = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo(
    () => ({ jobs, jobsStatus, fetchedAt, profile, matches, matchStatus, setProfile, deleteMyData, reloadJobs }),
    [jobs, jobsStatus, fetchedAt, profile, matches, matchStatus, setProfile, deleteMyData, reloadJobs],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("DataProvider missing");
  return v;
}
