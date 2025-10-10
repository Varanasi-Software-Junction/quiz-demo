import React, { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

/* ============================
   Utilities
   ============================ */

async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  if (!url) return null;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!resp.ok) {
      console.debug("fetchJson non-200", resp.status, url);
      return null;
    }
    const body = await resp.json();
    return body;
  } catch (err) {
    console.debug("fetchJson error:", err, url);
    return null;
  } finally {
    clearTimeout(id);
  }
}

function truncate(text, max = 120) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

/* ============================
   Models / Parsers
   ============================ */

function parseQuestion(raw) {
  // raw might be { id, text|question, answer }
  if (!raw || typeof raw !== "object") return null;
  const id = raw.id ?? "";
  const text = raw.text ?? raw.question ?? "";
  let answer = false;
  const rawAns = raw.answer;
  if (typeof rawAns === "boolean") answer = rawAns;
  else if (typeof rawAns === "string")
    answer = rawAns.toLowerCase() === "true";
  else answer = false;
  return { id, text, answer };
}

function buildQuestionSetFromRemote(remote, defaultId = "quiz", defaultTitle = "") {
  if (!remote) return null;
  // remote can be a list (questions array) or an object { id, title, questions: [...] }
  if (Array.isArray(remote)) {
    const questions = remote.map((r) => parseQuestion(r)).filter(Boolean);
    return { id: defaultId, title: defaultTitle, questions };
  }
  if (typeof remote === "object") {
    const questionsRaw = Array.isArray(remote.questions) ? remote.questions : [];
    const questions = questionsRaw.map((r) => parseQuestion(r)).filter(Boolean);
    return {
      id: remote.id ?? defaultId,
      title: remote.title ?? defaultTitle,
      questions,
    };
  }
  return null;
}

/* ============================
   UI helpers
   ============================ */

function NoticeCard({ message, onRetry }) {
  return (
    <div style={{ border: "1px solid #ffd54f", background: "#fff8e1", padding: 12, borderRadius: 6, margin: 8 }}>
      <div style={{ marginBottom: 8 }}>{message}</div>
      {onRetry && (
        <button onClick={onRetry} style={{ padding: "8px 12px" }}>
          Retry
        </button>
      )}
    </div>
  );
}

/* ============================
   StartScreen
   ============================ */

function StartScreen() {
  const [news, setNews] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notice, setNotice] = useState("Loading news...");
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    loadNewsThenSubjects();
    return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNewsThenSubjects() {
    setNotice("Loading news...");
    const nRemote = await fetchJson(
      "https://varanasi-software-junction.github.io/pictures-json/quizjson/news.json"
    );
    if (!isMounted.current) return;
    setNews(Array.isArray(nRemote) ? nRemote : []);
    setNotice("Loading subjects...");
    const sRemote = await fetchJson(
      "https://varanasi-software-junction.github.io/pictures-json/quizjson/subjects.json"
    );
    if (!isMounted.current) return;
    const sList = Array.isArray(sRemote) ? sRemote : [];
    setSubjects(sList);
    if (sList.length === 0) setNotice("Failed to load subjects.");
    else setNotice("");
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Quiz Demo</h1>
      <h3>Welcome to Quiz App</h3>

      {notice ? <NoticeCard message={notice} onRetry={loadNewsThenSubjects} /> : null}

      <div style={{ marginTop: 12 }}>
        {news.map((n, i) => (
          <div key={i} style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6, marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{truncate(n.title ?? "", 120)}</div>
            <div style={{ color: "#444", marginTop: 6 }}>{truncate(n.summary ?? "", 200)}</div>
            <div style={{ marginTop: 6 }}>
              <DetailsButton title={n.title ?? ""} details={n.details ?? ""} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <Link to="/subjects">
          <button disabled={subjects.length === 0} style={{ padding: "10px 16px", fontSize: 16 }}>
            View Subjects
          </button>
        </Link>
      </div>

      <div style={{ marginTop: 12 }}>
        <small style={{ color: "#666" }}>{subjects.length ? `${subjects.length} subjects loaded` : ""}</small>
      </div>
    </div>
  );
}

function DetailsButton({ title, details }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: "6px 10px" }}>
        Details
      </button>
      {open && (
        <div style={{
          position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000
        }}>
          <div style={{ background: "white", padding: 16, borderRadius: 8, width: "90%", maxWidth: 640 }}>
            <h3>{title}</h3>
            <div style={{ maxHeight: "60vh", overflow: "auto" }}>{details}</div>
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button onClick={() => setOpen(false)} style={{ padding: "8px 12px" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================
   SubjectsScreen
   ============================ */

function SubjectsScreen() {
  // We'll re-fetch subjects from StartScreen state? Simpler: fetch subjects again (cheap).
  const [subjects, setSubjects] = useState([]);
  const [notice, setNotice] = useState("Loading subjects...");
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    loadSubjects();
    return () => { isMounted.current = false; };
  }, []);

  async function loadSubjects() {
    setNotice("Loading subjects...");
    const sRemote = await fetchJson(
      "https://varanasi-software-junction.github.io/pictures-json/quizjson/subjects.json"
    );
    if (!isMounted.current) return;
    const list = Array.isArray(sRemote) ? sRemote : [];
    setSubjects(list);
    setNotice(list.length ? "" : "Failed to load subjects.");
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Subjects</h2>
        <Link to="/"><button style={{ padding: "8px 12px" }}>Back</button></Link>
      </div>

      {notice ? <NoticeCard message={notice} onRetry={loadSubjects} /> : null}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 12 }}>
        {subjects.map((s) => {
          const id = s.id ?? "";
          const name = s.name ?? s.title ?? "Untitled";
          const quizzesUrl = s.quizzes_url ?? s.quizzesUrl ?? "";
          return (
            <div key={id || name} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div style={{ marginTop: 8 }}>
                <Link to={`/quizzes/${encodeURIComponent(quizzesUrl)}/${encodeURIComponent(name)}/${encodeURIComponent(id)}`}>
                  <button disabled={!quizzesUrl} style={{ padding: "10px 12px" }}>
                    View Quizzes
                  </button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================
   QuizzesScreen
   ============================ */

function QuizzesScreenWrapper() {
  // We encoded quizzesUrl, subjectName, subjectId in the URL path segments.
  const params = useParams();
  // params: 0: quizzesUrl, 1: subjectName, 2: subjectId (react-router v6 captures named params; we'll use location fallback)
  // But because of slashes, safer to use query params. However for this example we packed them via path segments.
  // We'll instead read them from location and decode.
  const location = useLocation();
  // Expected path: /quizzes/:encodedQuizzesUrl/:encodedSubjectName/:encodedSubjectId
  const { "*": rest } = useParams(); // catch-all fallback
  // For simplicity, parse from pathname:
  const split = location.pathname.split("/").filter(Boolean);
  // split: ["quizzes", encodedQuizzesUrl, encodedSubjectName, encodedSubjectId]
  const encodedQuizzesUrl = split[1] ?? "";
  const encodedSubjectName = split[2] ?? "";
  const encodedSubjectId = split[3] ?? "";
  const quizzesUrl = decodeURIComponent(encodedQuizzesUrl);
  const subjectName = decodeURIComponent(encodedSubjectName);
  const subjectId = decodeURIComponent(encodedSubjectId);

  return <QuizzesScreen quizzesUrl={quizzesUrl} subjectName={subjectName} subjectId={subjectId} />;
}

function QuizzesScreen({ quizzesUrl, subjectName, subjectId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [notice, setNotice] = useState("Loading quizzes...");
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    loadQuizzes();
    return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizzesUrl]);

  async function loadQuizzes() {
    setNotice("Loading quizzes...");
    const qRemote = await fetchJson(quizzesUrl);
    if (!isMounted.current) return;
    const qList = Array.isArray(qRemote) ? qRemote : [];
    setQuizzes(qList);
    setNotice(qList.length ? "" : "Failed to load quizzes.");
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Quizzes • {subjectName}</h2>
        <div>
          <Link to="/subjects"><button style={{ padding: "8px 12px", marginRight: 8 }}>Back to Subjects</button></Link>
          <Link to="/"><button style={{ padding: "8px 12px" }}>Home</button></Link>
        </div>
      </div>

      {notice ? <NoticeCard message={notice} onRetry={loadQuizzes} /> : null}

      <div style={{ marginTop: 12 }}>
        {quizzes.map((q, idx) => {
          const id = q.id ?? `q_${idx}`;
          const title = q.title ?? "Untitled Quiz";
          const desc = q.description ?? "";
          const questionsUrl = q.questions_url ?? q.questionsUrl ?? "";
          // Build route to player with encoded questionsUrl and quiz metadata
          const route = `/player/${encodeURIComponent(questionsUrl)}/${encodeURIComponent(title)}/${encodeURIComponent(id)}`;
          return (
            <div key={id} style={{ border: "1px solid #ddd", padding: 10, borderRadius: 6, marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{title}</div>
              <div style={{ color: "#666", marginTop: 6 }}>{truncate(desc, 180)}</div>
              <div style={{ marginTop: 8 }}>
                <Link to={route}><button disabled={!questionsUrl} style={{ padding: "8px 12px" }}>Start</button></Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================
   PlayerScreen
   ============================ */

function PlayerScreenWrapper() {
  const location = useLocation();
  const split = location.pathname.split("/").filter(Boolean);
  // expected: ["player", encodedQuestionsUrl, encodedQuizTitle, encodedQuizId]
  const encodedQuestionsUrl = split[1] ?? "";
  const encodedQuizTitle = split[2] ?? "";
  const encodedQuizId = split[3] ?? "";
  const questionsUrl = decodeURIComponent(encodedQuestionsUrl);
  const quizTitle = decodeURIComponent(encodedQuizTitle);
  const quizId = decodeURIComponent(encodedQuizId);
  return <PlayerScreen questionsUrl={questionsUrl} quizTitle={quizTitle} quizId={quizId} />;
}

function PlayerScreen({ questionsUrl, quizTitle, quizId }) {
  const [questionSet, setQuestionSet] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(new Set());
  const [notice, setNotice] = useState("Loading questions...");
  const isMounted = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    isMounted.current = true;
    loadQuestions();
    return () => { isMounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsUrl]);

  async function loadQuestions() {
    setQuestionSet(null);
    setQIndex(0);
    setScore(0);
    setAnswered(new Set());
    setNotice("Loading questions...");
    const remote = questionsUrl ? await fetchJson(questionsUrl) : null;
    if (!isMounted.current) return;
    const parsed = buildQuestionSetFromRemote(remote, quizId || "quiz", quizTitle || "");
    if (!parsed || (parsed.questions && parsed.questions.length === 0)) {
      console.debug("Failed to parse question set", { remote });
      setQuestionSet(null);
      setNotice("Failed to load questions.");
      return;
    }
    setQuestionSet(parsed);
    setNotice("");
  }

  function currentQuestion() {
    if (!questionSet) return null;
    if (qIndex < 0 || qIndex >= questionSet.questions.length) return null;
    return questionSet.questions[qIndex];
  }

  function answerCurrent(selected) {
    const qs = questionSet;
    if (!qs) return;
    const q = qs.questions[qIndex];
    if (!q) return;
    const qid = q.id && q.id.length ? q.id : `qindex_${qIndex}`;
    if (answered.has(qid)) return; // already answered

    const correct = q.answer === selected;
    if (correct) setScore((s) => s + 1);
    setAnswered((prev) => new Set(prev).add(qid));
    // quick feedback
    showFlash(correct ? "Correct!" : "Wrong!");
  }

  function showFlash(msg) {
    // small transient message using alert-like div
    const el = document.createElement("div");
    el.textContent = msg;
    el.style.position = "fixed";
    el.style.bottom = "24px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.background = "#323232";
    el.style.color = "white";
    el.style.padding = "8px 12px";
    el.style.borderRadius = "6px";
    el.style.zIndex = 2000;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 300ms";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 700);
  }

  function nextQuestion() {
    if (!questionSet) return;
    if (qIndex < questionSet.questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      gotoResult();
    }
  }

  function prevQuestion() {
    if (!questionSet) return;
    if (qIndex > 0) setQIndex((i) => i - 1);
  }

  function gotoResult() {
    const total = questionSet ? questionSet.questions.length : 0;
    // Replace current history entry with result screen (like pushReplacement)
    navigate(`/result/${score}/${total}/${encodeURIComponent(quizId)}/${encodeURIComponent(quizTitle)}/${encodeURIComponent(questionsUrl)}`, { replace: true });
  }

  if (!questionSet) {
    return (
      <div style={{ padding: 16 }}>
        <h2>{quizTitle || "Quiz"}</h2>
        {notice ? <NoticeCard message={notice} onRetry={loadQuestions} /> : <div style={{ padding: 12 }}><em>Preparing...</em></div>}
        <div style={{ marginTop: 12 }}>
          <Link to="/"><button style={{ padding: "8px 12px", marginRight: 8 }}>Home</button></Link>
          <Link to="/subjects"><button style={{ padding: "8px 12px" }}>Back</button></Link>
        </div>
      </div>
    );
  }

  // render current question
  const q = currentQuestion();
  const already = q && (answered.has((q.id && q.id.length) ? q.id : `qindex_${qIndex}`));

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", minHeight: "80vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{quizTitle}</h2>
        <div>
          <Link to="/"><button style={{ padding: "8px 12px", marginRight: 8 }}>Home</button></Link>
          <Link to="/subjects"><button style={{ padding: "8px 12px" }}>Back</button></Link>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600 }}>{questionSet.title}</div>
        <div style={{ marginTop: 6 }}>
          {questionSet.questions.length > 0 && (
            <>
              <div>Question {qIndex + 1} / {questionSet.questions.length}</div>
              <div style={{ marginTop: 12, fontSize: 18 }}>{q.text}</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <button onClick={() => answerCurrent(true)} disabled={already || notice} style={{ padding: "12px 16px", width: "100%", marginBottom: 8 }}>
          True
        </button>
        <button onClick={() => answerCurrent(false)} disabled={already || notice} style={{ padding: "12px 16px", width: "100%" }}>
          False
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div>Score: {score}</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={prevQuestion} disabled={notice || qIndex <= 0} style={{ flex: 1, padding: "12px 8px" }}>Previous</button>
        <button onClick={nextQuestion} disabled={notice} style={{ flex: 1, padding: "12px 8px" }}>Next</button>
      </div>

      <div style={{ marginTop: "auto" }}>
        <button onClick={gotoResult} disabled={notice} style={{ width: "100%", padding: "14px 16px", marginTop: 12 }}>
          Finish Now
        </button>
      </div>
    </div>
  );
}

/* ============================
   ResultScreen
   ============================ */

function ResultScreenWrapper() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  // expected: ["result", score, total, quizId, quizTitle, questionsUrl]
  const score = parseInt(parts[1] ?? "0", 10) || 0;
  const total = parseInt(parts[2] ?? "0", 10) || 0;
  const quizId = decodeURIComponent(parts[3] ?? "");
  const quizTitle = decodeURIComponent(parts[4] ?? "");
  const questionsUrl = decodeURIComponent(parts[5] ?? "");
  return <ResultScreen score={score} total={total} quizId={quizId} quizTitle={quizTitle} questionsUrl={questionsUrl} />;
}

function ResultScreen({ score, total, quizId, quizTitle, questionsUrl }) {
  const navigate = useNavigate();
  function backToHome() {
    navigate("/", { replace: true });
  }
  function retry() {
    // push replacement to player (like retry)
    navigate(`/player/${encodeURIComponent(questionsUrl)}/${encodeURIComponent(quizTitle)}/${encodeURIComponent(quizId)}`, { replace: true });
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Result</h2>
      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
        <div style={{ fontSize: 18 }}>Finished! Score: {score} / {total}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={backToHome} style={{ width: "100%", padding: "12px 14px", marginBottom: 8 }}>Back to Home</button>
        <button onClick={retry} style={{ width: "100%", padding: "12px 14px" }}>Retry Quiz</button>
      </div>
    </div>
  );
}

/* ============================
   App & Routing
   ============================ */

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: "system-ui, Arial, sans-serif", color: "#222", minHeight: "100vh", background: "#fafafa" }}>
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/subjects" element={<SubjectsScreen />} />
          <Route path="/quizzes/*" element={<QuizzesScreenWrapper />} />
          <Route path="/player/*" element={<PlayerScreenWrapper />} />
          <Route path="/result/*" element={<ResultScreenWrapper />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Page not found</h2>
      <Link to="/"><button style={{ padding: "8px 12px" }}>Home</button></Link>
    </div>
  );
}
