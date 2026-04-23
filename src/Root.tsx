import { Composition } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { SSDemo, ssDemoSchema } from "./SSDemo";
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
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema2}
        defaultProps={{
          logoColor1: "#91dAE2" as const,
          logoColor2: "#86A8E7" as const,
        }}
      />

      <Composition
        id="SSLSpeaker"
        component={SSDemo}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        schema={ssDemoSchema}
        defaultProps={{
          speakerName: "Danny McMillan",
          talkTitle: "Building an AI-Powered Amazon Business in 2026",
          eventDate: "May 2026 · London",
        }}
      />

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
        defaultProps={{}}
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
        defaultProps={{}}
      />
    </>
  );
};
