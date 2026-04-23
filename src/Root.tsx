import { Composition } from "remotion";
import { DEFAULT_MIXER } from "./explainer-shared";
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
          musicHigh: 0.4,
          musicDuck: 0.05,
          sfxIntroVolume: 0.65,
          sfxOutroVolume: 0.55,
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
          musicHigh: 0.4,
          musicDuck: 0.35,
          sfxIntroVolume: 1,
          sfxOutroVolume: 0.55,
        }}
      />
    </>
  );
};
