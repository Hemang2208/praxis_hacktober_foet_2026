import React, { useEffect, useState } from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { useRepoCommits } from '@/redux/hooks';
import { fetchRepoCommits } from '@/redux/slice/github.slice';

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface Props {
  owner: string;
  repo: string;
}

const GitHubCommits: React.FC<Props> = ({ owner, repo }) => {
  const dispatch = useAppDispatch();
  const { commits: cachedCommits, loading, error } = useRepoCommits(owner, repo);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    // If we have no cached commits for this repo, fetch and cache them
    if (owner && repo && !cachedCommits) {
      setLocalLoading(true);
      dispatch(fetchRepoCommits({ owner, repo })).finally(() => setLocalLoading(false));
    }
  }, [owner, repo, cachedCommits, dispatch]);

  const isLoading = loading || localLoading;
  if (isLoading) return <div>Loading commits...</div>;
  if (error) return <div>{error}</div>;

  const commitsToRender = (cachedCommits ?? []) as Commit[];

  return (
    <div>
      <h2>Recent Commits</h2>
      <div className="github-commits-header">
        <h2>Recent Commits</h2>
        <div>
          <button onClick={() => { if (owner && repo) dispatch(fetchRepoCommits({ owner, repo })); }}>
            Refresh
          </button>
        </div>
      </div>
      <ul>
        {commitsToRender.map((commit) => (
          <li key={commit.sha}>
            <a href={commit.html_url} target="_blank" rel="noopener noreferrer">
              {commit.commit.message}
            </a>
            <br />
            <small>
              {commit.commit.author.name} - {new Date(commit.commit.author.date).toLocaleString()}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GitHubCommits;
