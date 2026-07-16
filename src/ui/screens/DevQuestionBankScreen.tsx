import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { ScreenFrame } from "../components/ScreenFrame";
import { useGameStore } from "../../app/store/gameStore";

export function DevQuestionBankScreen() {
  const navigate = useGameStore((state) => state.navigate);
  return (
    <ScreenFrame title="Banque de questions">
      <section className="setup-screen">
        <div className="screen-heading">
          <h1>Banque de questions</h1>
          <p>Inspection développeur de la banque JSON locale. L'édition viendra dans un lot ultérieur.</p>
        </div>
        <Panel className="format-card">
          <dl>
            <div><dt>Fichier</dt><dd>/questions/v1.sample.json</dd></div>
            <div><dt>Validation</dt><dd>Zod au chargement</dd></div>
            <div><dt>Statuts</dt><dd>draft · review · approved · rejected</dd></div>
          </dl>
        </Panel>
        <Button variant="primary" onClick={() => navigate("settings")}>Retour paramètres</Button>
      </section>
    </ScreenFrame>
  );
}
