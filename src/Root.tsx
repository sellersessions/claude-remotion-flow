import { Composition } from "remotion";
import {
  FormatExplainer,
  formatExplainerSchema,
  calculateMetadata as formatExplainerCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as formatExplainerFallbackDuration,
} from "./FormatExplainer";
import {
  TreatmentExplainer,
  treatmentExplainerSchema,
  calculateMetadata as treatmentExplainerCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as treatmentExplainerFallbackDuration,
} from "./TreatmentExplainer";
import {
  StackExplainer,
  stackExplainerSchema,
  calculateMetadata as stackExplainerCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as stackExplainerFallbackDuration,
} from "./StackExplainer";
import {
  WorkshopIntroCh03,
  workshopIntroCh03Schema,
  calculateMetadata as workshopIntroCh03CalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as workshopIntroCh03FallbackDuration,
} from "./WorkshopIntroCh03";
import {
  WorkshopIntroCh05,
  workshopIntroCh05Schema,
  calculateMetadata as workshopIntroCh05CalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as workshopIntroCh05FallbackDuration,
} from "./WorkshopIntroCh05";
import {
  WorkshopVideo01TheSetup,
  workshopVideo01TheSetupSchema,
  calculateMetadata as workshopVideo01TheSetupCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as workshopVideo01TheSetupFallbackDuration,
} from "./WorkshopVideo01TheSetup";
import {
  WorkshopVideo02TheSystem,
  workshopVideo02TheSystemSchema,
  calculateMetadata as workshopVideo02TheSystemCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as workshopVideo02TheSystemFallbackDuration,
} from "./WorkshopVideo02TheSystem";
import {
  WorkshopVideo03TheToolkit,
  workshopVideo03TheToolkitSchema,
  calculateMetadata as workshopVideo03TheToolkitCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as workshopVideo03TheToolkitFallbackDuration,
} from "./WorkshopVideo03TheToolkit";
import {
  WorkshopOverview,
  workshopOverviewSchema,
  calculateMetadata as workshopOverviewCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as workshopOverviewFallbackDuration,
} from "./WorkshopOverview";
import {
  UmbrellaTutorial,
  umbrellaTutorialSchema,
  calculateUmbrellaTutorialMetadata,
  UMBRELLA_TUTORIAL_DURATION,
} from "./compositions/UmbrellaTutorial";
import {
  ClaudeCodeToolsWindows,
  claudeCodeToolsWindowsSchema,
  calculateMetadata as claudeCodeToolsWindowsCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as claudeCodeToolsWindowsFallbackDuration,
} from "./ClaudeCodeToolsWindows";
import {
  ClaudeUiWorkflowExplainer,
  claudeUiWorkflowExplainerSchema,
  calculateMetadata as claudeUiWorkflowExplainerCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as claudeUiWorkflowExplainerFallbackDuration,
} from "./ClaudeUiWorkflowExplainer";
import {
  ClaudeVideoEditingFlowExplainer,
  claudeVideoEditingFlowExplainerSchema,
  calculateMetadata as claudeVideoEditingFlowExplainerCalculateMetadata,
  FALLBACK_DURATION_IN_FRAMES as claudeVideoEditingFlowExplainerFallbackDuration,
} from "./ClaudeVideoEditingFlowExplainer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FormatExplainer"
        component={FormatExplainer}
        calculateMetadata={formatExplainerCalculateMetadata}
        durationInFrames={formatExplainerFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={formatExplainerSchema}
        defaultProps={{}}
      />
      <Composition
        id="TreatmentExplainer"
        component={TreatmentExplainer}
        calculateMetadata={treatmentExplainerCalculateMetadata}
        durationInFrames={treatmentExplainerFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={treatmentExplainerSchema}
        defaultProps={{
          sfxIntroVolume: 0.65,
          sfxOutroVolume: 0.55,
          // musicHigh/musicDuck retained at 0 for type compat with shared
          // ExplainerProps — no longer used (BED_VOLUME is hard-coded in source).
          musicHigh: 0,
          musicDuck: 0,
        }}
      />
      <Composition
        id="StackExplainer"
        component={StackExplainer}
        calculateMetadata={stackExplainerCalculateMetadata}
        durationInFrames={stackExplainerFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={stackExplainerSchema}
        defaultProps={{
          sfxIntroVolume: 0.55,
          sfxOutroVolume: 0.55,
          // musicHigh/musicDuck retained at 0 for type compat with shared
          // ExplainerProps — no longer used (BED_VOLUME is hard-coded in source).
          musicHigh: 0,
          musicDuck: 0,
        }}
      />
      <Composition
        id="WorkshopIntroCh03"
        component={WorkshopIntroCh03}
        calculateMetadata={workshopIntroCh03CalculateMetadata}
        durationInFrames={workshopIntroCh03FallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={workshopIntroCh03Schema}
        defaultProps={{
          musicHigh: 0.15,
          musicDuck: 1,
          sfxIntroVolume: 0.7,
          sfxOutroVolume: 0.7,
        }}
      />
      <Composition
        id="WorkshopIntroCh05"
        component={WorkshopIntroCh05}
        calculateMetadata={workshopIntroCh05CalculateMetadata}
        durationInFrames={workshopIntroCh05FallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={workshopIntroCh05Schema}
        defaultProps={{
          musicHigh: 0.15,
          musicDuck: 1,
          sfxIntroVolume: 0.7,
          sfxOutroVolume: 0.7,
        }}
      />
      <Composition
        id="WorkshopVideo01TheSetup"
        component={WorkshopVideo01TheSetup}
        calculateMetadata={workshopVideo01TheSetupCalculateMetadata}
        durationInFrames={workshopVideo01TheSetupFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={workshopVideo01TheSetupSchema}
        defaultProps={{
          musicHigh: 0.15,
          musicDuck: 1,
          sfxIntroVolume: 0.7,
          sfxOutroVolume: 0.7,
        }}
      />
      <Composition
        id="WorkshopVideo02TheSystem"
        component={WorkshopVideo02TheSystem}
        calculateMetadata={workshopVideo02TheSystemCalculateMetadata}
        durationInFrames={workshopVideo02TheSystemFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={workshopVideo02TheSystemSchema}
        defaultProps={{
          musicHigh: 0.15,
          musicDuck: 1,
          sfxIntroVolume: 0.7,
          sfxOutroVolume: 0.7,
        }}
      />
      <Composition
        id="WorkshopVideo03TheToolkit"
        component={WorkshopVideo03TheToolkit}
        calculateMetadata={workshopVideo03TheToolkitCalculateMetadata}
        durationInFrames={workshopVideo03TheToolkitFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={workshopVideo03TheToolkitSchema}
        defaultProps={{
          musicHigh: 0.15,
          musicDuck: 1,
          sfxIntroVolume: 0.7,
          sfxOutroVolume: 0.7,
        }}
      />
      <Composition
        id="WorkshopOverview"
        component={WorkshopOverview}
        calculateMetadata={workshopOverviewCalculateMetadata}
        durationInFrames={workshopOverviewFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={workshopOverviewSchema}
        defaultProps={{
          musicHigh: 0.35,
          musicDuck: 1,
          sfxIntroVolume: 0.7,
          sfxOutroVolume: 0.7,
        }}
      />
      <Composition
        id="UmbrellaTutorial"
        component={UmbrellaTutorial}
        calculateMetadata={calculateUmbrellaTutorialMetadata}
        durationInFrames={UMBRELLA_TUTORIAL_DURATION}
        fps={30}
        width={1920}
        height={1080}
        schema={umbrellaTutorialSchema}
        defaultProps={{ bedVolume: 0.1, sfxIntroVolume: 1, sfxOutroVolume: 0.55 }}
      />
      <Composition
        id="ClaudeCodeToolsWindows"
        component={ClaudeCodeToolsWindows}
        calculateMetadata={claudeCodeToolsWindowsCalculateMetadata}
        durationInFrames={claudeCodeToolsWindowsFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={claudeCodeToolsWindowsSchema}
        defaultProps={{
          bedVolume: 0.1,
          sfxIntroVolume: 0.5,
          sfxOutroVolume: 0.5,
        }}
      />
      <Composition
        id="ClaudeUiWorkflowExplainer"
        component={ClaudeUiWorkflowExplainer}
        calculateMetadata={claudeUiWorkflowExplainerCalculateMetadata}
        durationInFrames={claudeUiWorkflowExplainerFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={claudeUiWorkflowExplainerSchema}
        defaultProps={{
          musicHigh: 0.10,
          musicDuck: 0,
          sfxIntroVolume: 0.55,
          sfxOutroVolume: 0.55,
        }}
      />
      <Composition
        id="ClaudeVideoEditingFlowExplainer"
        component={ClaudeVideoEditingFlowExplainer}
        calculateMetadata={claudeVideoEditingFlowExplainerCalculateMetadata}
        durationInFrames={claudeVideoEditingFlowExplainerFallbackDuration}
        fps={30}
        width={1920}
        height={1080}
        schema={claudeVideoEditingFlowExplainerSchema}
        defaultProps={{
          musicHigh: 0.06,
          musicDuck: 0,
          sfxIntroVolume: 0.55,
          sfxOutroVolume: 0.55,
        }}
      />
    </>
  );
};
