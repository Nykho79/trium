import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { loadLocalQuestionBank } from "../../data/localQuestionBank";
import { useGameStore } from "../../app/store/gameStore";

export function DevQuestionBankScreen() {
  const navigate = useGameStore((state) => state.navigate);
  const bank = loadLocalQuestionBank();
  const sampleQuestions = bank.sourceQuestions.slice(0, 12);

  return (
    <ScreenFrame title="Banque de questions">
      <section className="setup-screen general-screen question-bank-dev-screen">
        <div className="screen-heading">
          <Badge tone="cyan">Mode dev</Badge>
          <h1>Banque de questions</h1>
          <p>Inspection des fichiers JSON locaux, validation Zod, filtrage éditorial et préparation de la sélection pondérée.</p>
        </div>

        <div className="result-metrics-grid">
          <Card accent="cyan"><span>Total</span><strong>{bank.report.totalCount}</strong></Card>
          <Card accent="cyan"><span>Fichiers</span><strong>{bank.report.fileCount}</strong></Card>
          <Card accent="amber"><span>Jouables</span><strong>{bank.report.playableCount}</strong></Card>
          <Card accent="violet"><span>Vérifiées</span><strong>{bank.report.verifiedCount}</strong></Card>
          <Card accent="neutral"><span>Rejetées V1</span><strong>{bank.report.rejectedCount}</strong></Card>
          <Card accent="neutral"><span>Doublons exacts</span><strong>{bank.report.exactDuplicates.length}</strong></Card>
          <Card accent="neutral"><span>Doublons probables</span><strong>{bank.report.probableDuplicates.length}</strong></Card>
          <Card accent={bank.report.validationErrors.length > 0 ? "amber" : "cyan"}><span>Erreurs Zod</span><strong>{bank.report.validationErrors.length}</strong></Card>
        </div>

        <Panel className="question-report-grid">
          <div>
            <h2>Catégories</h2>
            <dl className="compact-stat-list">
              {Object.entries(bank.report.byCategory).map(([category, count]) => <div key={category}><dt>{category}</dt><dd>{count}</dd></div>)}
            </dl>
          </div>
          <div>
            <h2>Difficultés</h2>
            <dl className="compact-stat-list">
              {Object.entries(bank.report.byDifficulty).map(([difficulty, count]) => <div key={difficulty}><dt>Niveau {difficulty}</dt><dd>{count}</dd></div>)}
            </dl>
          </div>
          <div>
            <h2>Bonnes réponses</h2>
            <dl className="compact-stat-list">
              {Object.entries(bank.report.correctAnswerDistribution).map(([answer, count]) => <div key={answer}><dt>Option {answer.toUpperCase()}</dt><dd>{count}</dd></div>)}
            </dl>
          </div>
        </Panel>

        <Panel className="loaded-question-list">
          <h2>Questions chargées</h2>
          {sampleQuestions.map((question) => (
            <article key={question.id}>
              <div>
                <strong>{question.id}</strong>
                <span>{question.category} / {question.subcategory}</span>
              </div>
              <p>{question.question}</p>
              <Badge tone={question.verificationStatus === "verified" && question.status === "approved" ? "success" : "neutral"}>
                {question.verificationStatus} - {question.status}
              </Badge>
            </article>
          ))}
        </Panel>

        <div className="screen-actions">
          <Button variant="secondary" onClick={() => navigate("settings")}>Retour paramètres</Button>
          <Button variant="primary" onClick={() => navigate("home")}>Accueil</Button>
        </div>
      </section>
    </ScreenFrame>
  );
}
