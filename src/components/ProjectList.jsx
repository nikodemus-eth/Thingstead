import { useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { useProject } from "../contexts/ProjectContext.jsx";
import {
  saveProject,
  loadProject,
  saveProjectIndex,
  deleteProject,
  saveProjectAndIndex,
  deleteProjectAndIndex,
} from "../utils/storage.js";
import { buildExportBundle, importProject } from "../utils/importExport.js";
import { buildBundleFilename } from "../utils/exportBundle.js";
import {
  webShareFileTransport,
  downloadJsonTransport,
  clipboardJsonTransport,
} from "../utils/share/transports.js";
import {
  fetchRemoteProject,
  fetchRemoteIndex,
  upsertRemoteProject,
  deleteRemoteProject,
} from "../utils/lanSync.js";
import { randomUUID } from "../utils/uuid.js";
import { buildNewCpmaiProject } from "../plans/cpmai/index.js";
import GlyphIcon from "./GlyphIcon.jsx";
import CreateModal from "./modals/CreateModal.jsx";
import DeleteModal from "./modals/DeleteModal.jsx";
import CollisionModal from "./modals/CollisionModal.jsx";
import ConflictModal from "./modals/ConflictModal.jsx";
import ShareModal from "./modals/ShareModal.jsx";
import styles from "./ProjectList.module.css";

function buildIndex(projects, currentProjectId) {
  return {
    currentProjectId,
    projects,
  };
}

export default function ProjectList() {
  const { state, dispatch } = useProject();
  const fileInputRef = useRef(null);
  const [notice, setNotice] = useState(null);
  const [collisionProject, setCollisionProject] = useState(null);
  const [conflictState, setConflictState] = useState(null); // { project, serverProject }
  const [createModal, setCreateModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [shareModal, setShareModal] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const timeoutMs = notice.type === "error" ? 6500 : 2500;
    const t = window.setTimeout(() => setNotice(null), timeoutMs);
    return () => window.clearTimeout(t);
  }, [notice]);

  const projects = state.projects || {};
  const projectList = Object.values(projects);

  const handleCreateClick = () => {
    setCreateModal({ name: "", step: "name" });
  };

  const handleCreateSubmitName = () => {
    const name = createModal?.name?.trim();
    if (!name) return;
    setCreateModal({ ...createModal, name, step: "governance" });
  };

  const handleCreateSubmitGovernance = (governanceMode) => {
    const name = createModal?.name?.trim();
    if (!name) return;
    setCreateModal(null);

    const project = buildNewCpmaiProject(name, state.settings?.deviceId, governanceMode);
    const projectData = { current: project, history: [], historyIndex: -1 };

    const summary = {
      id: project.id,
      name: project.name,
      lastModified: project.lastModified,
      lastSavedFrom: project.lastSavedFrom,
    };
    const nextProjects = { ...projects, [project.id]: summary };
    saveProjectAndIndex(project.id, projectData, buildIndex(nextProjects, project.id));

    dispatch({
      type: "CREATE_PROJECT",
      payload: { projectId: project.id, projectSummary: summary, projectData },
    });

    // Best-effort LAN sync — show conflict modal if the server has a newer version.
    upsertRemoteProject(project)
      .then((result) => {
        if (result?.status === "conflict") {
          setConflictState({ project, serverProject: result.serverProject });
        }
      })
      .catch(() => {});
    fetchRemoteIndex()
      .then((index) => index && saveProjectIndex(index))
      .catch(() => {});
  };

  const handleSelect = async (projectId) => {
    let projectData = loadProject(projectId);
    if (!projectData) {
      const remote = await fetchRemoteProject(projectId);
      if (!remote) return;
      projectData = { current: remote, history: [], historyIndex: -1 };
      saveProject(projectId, projectData);
    }
    saveProjectIndex(buildIndex(projects, projectId));
    dispatch({
      type: "SET_CURRENT_PROJECT",
      payload: { projectId, projectData },
    });
  };

  const handleDeleteClick = (projectId) => {
    setDeleteModal(projectId);
  };

  const handleDeleteConfirm = () => {
    const projectId = deleteModal;
    if (!projectId) return;
    setDeleteModal(null);

    deleteRemoteProject(projectId).catch(() => {});

    const nextProjects = { ...projects };
    delete nextProjects[projectId];
    const nextCurrentId =
      state.currentProjectId === projectId ? null : state.currentProjectId;
    // Keep index+project deletion consistent.
    if (!deleteProjectAndIndex(projectId, buildIndex(nextProjects, nextCurrentId))) {
      // Fallback best-effort.
      deleteProject(projectId);
      saveProjectIndex(buildIndex(nextProjects, nextCurrentId));
    }

    dispatch({ type: "DELETE_PROJECT", payload: { projectId } });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const addProjectToIndex = (project) => {
    const projectData = { current: project, history: [], historyIndex: -1 };

    const summary = {
      id: project.id,
      name: project.name,
      lastModified: project.lastModified,
      lastSavedFrom: project.lastSavedFrom,
    };

    const nextProjects = { ...projects, [project.id]: summary };
    saveProjectAndIndex(project.id, projectData, buildIndex(nextProjects, project.id));

    dispatch({
      type: "CREATE_PROJECT",
      payload: { projectId: project.id, projectSummary: summary, projectData },
    });

    upsertRemoteProject(project)
      .then((result) => {
        if (result?.status === "conflict") {
          setConflictState({ project, serverProject: result.serverProject });
        }
      })
      .catch(() => {});
    fetchRemoteIndex()
      .then((index) => index && saveProjectIndex(index))
      .catch(() => {});
  };

  const resolveCollision = (mode) => {
    if (!collisionProject) return;
    let project = collisionProject;

    if (mode === "keep-both") {
      project = {
        ...collisionProject,
        id: randomUUID(),
        name: `${collisionProject.name} (Imported)`,
      };
    }

    if (mode === "overwrite" || mode === "keep-both") {
      addProjectToIndex(project);
      setNotice({
        type: "success",
        message: "Project imported successfully.",
      });
    }

    setCollisionProject(null);
  };

  const resolveConflict = async (mode) => {
    if (!conflictState) return;
    const { project, serverProject } = conflictState;

    if (mode === "cancel") {
      setConflictState(null);
      return;
    }

    if (mode === "mine") {
      // Force-push local version with a fresh timestamp so shouldAcceptWrite passes.
      const forced = { ...project, lastModified: new Date().toISOString() };
      const result = await upsertRemoteProject(forced);
      if (result?.status !== "ok" && result?.status !== "unavailable") {
        setNotice({ type: "error", message: "Failed to push local version to server. Try again." });
        return; // leave modal open for retry
      }
    } else if (mode === "theirs" && serverProject) {
      // Apply the server version locally only — do NOT re-upload it.
      const projectData = { current: serverProject, history: [], historyIndex: -1 };
      const summary = {
        id: serverProject.id,
        name: serverProject.name,
        lastModified: serverProject.lastModified,
        lastSavedFrom: serverProject.lastSavedFrom,
      };
      const nextProjects = { ...projects, [serverProject.id]: summary };
      saveProjectAndIndex(serverProject.id, projectData, buildIndex(nextProjects, serverProject.id));
      dispatch({ type: "CREATE_PROJECT", payload: { projectId: serverProject.id, projectSummary: summary, projectData } });
    } else if (mode === "both" && serverProject) {
      // Clone server version with a new ID.
      addProjectToIndex({
        ...serverProject,
        id: randomUUID(),
        name: `${serverProject.name} (Server Copy)`,
      });
    }

    setConflictState(null); // only reached on success
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const jsonString = await file.text();
    const result = importProject(jsonString, projects);

    if (result.status === "invalid") {
      setNotice({
        type: "error",
        message: result.errors.join("\n"),
      });
      return;
    }

    let project = result.project;

    if (result.status === "collision") {
      setCollisionProject(project);
      return;
    }

    addProjectToIndex(project);
    setNotice({ type: "success", message: "Project imported successfully." });

    event.target.value = "";
  };

  const handleShareClick = (projectId) => {
    setShareModal({
      status: "loading",
      projectId,
      bundle: null,
      jsonString: null,
      filename: null,
    });

    (async () => {
      try {
        // Some clients may have only the remote index (LAN sync) without the full project cached.
        // Fetch on demand so Share works consistently across LAN machines.
        let projectData = loadProject(projectId);
        if (!projectData?.current) {
          const remote = await fetchRemoteProject(projectId);
          if (!remote) {
            throw new Error("Project data is not available locally and could not be fetched from the LAN server.");
          }
          projectData = { current: remote, history: [], historyIndex: -1 };
          saveProject(projectId, projectData);
        }

        const bundle = await buildExportBundle(projectData.current);
        const jsonString = JSON.stringify(bundle, null, 2);
        const filename = buildBundleFilename(bundle);

        setShareModal((prev) => {
          if (!prev || prev.projectId !== projectId) return prev;
          return { status: "ready", projectId, bundle, jsonString, filename };
        });
      } catch (e) {
        setShareModal((prev) => {
          if (!prev || prev.projectId !== projectId) return prev;
          return { status: "error", projectId, error: e?.message || String(e) };
        });
      }
    })();
  };

  const runShareAction = async (transport) => {
    if (!shareModal || shareModal.status !== "ready") return;
    try {
      await transport.run({
        bundle: shareModal.bundle,
        jsonString: shareModal.jsonString,
        filename: shareModal.filename,
      });
      const msg =
        transport.id === "clipboard-json"
          ? "Copied to clipboard."
          : transport.id === "download-json"
            ? "Download started."
            : "Share sheet opened.";
      setNotice({ type: "success", message: msg });
    } catch (e) {
      const raw = e?.message || String(e);
      const short = raw.length > 140 ? `${raw.slice(0, 140)}…` : raw;
      setNotice({
        type: "error",
        message: `${short}\nUse Download JSON instead.`,
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <GlyphIcon name="project" size={16} />
        Projects
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={handleCreateClick} className={styles.withIcon}>
          <GlyphIcon name="add" size={14} />
          <span>New Project</span>
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className={`${styles.withIcon} ${styles.syncAction}`}
        >
          <GlyphIcon name="guided" size={14} />
          <span>Import Project</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className={styles.hiddenInput}
        />
      </div>

      <div
        aria-live={notice?.type === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        className={
          notice
            ? notice.type === "error"
              ? styles.noticeError
              : styles.noticeSuccess
            : styles.noticeSrOnly
        }
      >
        {notice?.message ?? ""}
      </div>

      {projectList.length === 0 ? (
        <div className={styles.empty}>No projects yet.</div>
      ) : (
        <Motion.ul
          className={styles.list}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {projectList.map((project) => (
            <Motion.li
              key={project.id}
              className={styles.listItem}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={() => {
                  void handleSelect(project.id);
                }}
                aria-current={
                  project.id === state.currentProjectId ? "page" : undefined
                }
                className={
                  project.id === state.currentProjectId
                    ? styles.activeButton
                    : styles.selectButton
                }
              >
                <span className={styles.withIcon}>
                  <GlyphIcon name="project" size={14} />
                  {project.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleShareClick(project.id);
                }}
                className={`${styles.exportButton} ${styles.withIcon}`}
              >
                <GlyphIcon name="export" size={14} />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClick(project.id)}
                className={`${styles.deleteButton} ${styles.withIcon}`}
              >
                <GlyphIcon name="remove" size={14} />
                <span>Delete</span>
              </button>
            </Motion.li>
          ))}
        </Motion.ul>
      )}

      <CreateModal
        createModal={createModal}
        setCreateModal={setCreateModal}
        onSubmitName={handleCreateSubmitName}
        onSubmitGovernance={handleCreateSubmitGovernance}
      />

      {deleteModal && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {collisionProject && (
        <CollisionModal onResolve={resolveCollision} />
      )}

      {conflictState && (
        <ConflictModal
          projectName={conflictState.project?.name || conflictState.project?.id || "Unknown"}
          onResolve={resolveConflict}
        />
      )}

      <ShareModal
        shareModal={shareModal}
        onClose={() => setShareModal(null)}
        onRunAction={runShareAction}
        webShareFileTransport={webShareFileTransport}
        downloadJsonTransport={downloadJsonTransport}
        clipboardJsonTransport={clipboardJsonTransport}
      />
    </div>
  );
}
