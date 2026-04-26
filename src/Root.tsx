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
          musicHigh: 0.1,
          musicDuck: 0.5,
          sfxIntroVolume: 0.55,
          sfxOutroVolume: 0.55,
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
    </>
  );
};
