import "./App.css";
import { FileAudioIcon } from "./assets/icons/AudioRecorder";
import { useRef, useState } from "react";
import {
  TranscriptResponse,
  UploadResponse,
} from "./utils/types/AudioRecorder";
import { STATUS_MESSAGES } from "./utils/messages/ApiStatus";

const API_KEY = import.meta.env.VITE_API_KEY;
const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL;
const TRANSCRIPT_URL = import.meta.env.VITE_TRANSCRIPT_URL;

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transcription, setTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const uploadAudioFile = async (file: File): Promise<string> => {
    const response = await fetch(UPLOAD_URL ?? "", {
      method: "POST",
      headers: {
        Authorization: API_KEY ?? "",
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error("Error al subir el archivo");
    }

    const data: UploadResponse = await response.json();
    return data.upload_url;
  };

  const startTranscription = async (audioUrl: string): Promise<string> => {
    const response = await fetch(TRANSCRIPT_URL ?? "", {
      method: "POST",
      headers: {
        Authorization: API_KEY ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audio_url: audioUrl, language_code: "es" }),
    });

    if (!response.ok) {
      throw new Error("Error al iniciar la transcripción");
    }

    const data: TranscriptResponse = await response.json();
    return data.id;
  };

  const checkTranscriptionStatus = async (
    transcriptId: string
  ): Promise<TranscriptResponse> => {
    const response = await fetch(`${TRANSCRIPT_URL}/${transcriptId}`, {
      headers: { Authorization: API_KEY ?? "" },
    });

    if (!response.ok) {
      throw new Error("Error al verificar el estado de la transcripción");
    }

    return response.json();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage(STATUS_MESSAGES.uploading);

    try {
      const audioUrl = await uploadAudioFile(file);
      console.log("URL del audio:", audioUrl);

      const transcriptId = await startTranscription(audioUrl);

      let status = "queued";
      let transcriptResult: TranscriptResponse = { id: "", status: "" };

      while (status === "queued" || status === "processing") {
        transcriptResult = await checkTranscriptionStatus(transcriptId);
        status = transcriptResult.status;

        console.log("Estado de la transcripción:", status);

        if (status === "queued") {
          setStatusMessage(STATUS_MESSAGES.queued);
        } else if (status === "processing") {
          setStatusMessage(STATUS_MESSAGES.processing);
        }

        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      if (status === "completed") {
        setTranscription(transcriptResult.text || STATUS_MESSAGES.error);
        setStatusMessage(STATUS_MESSAGES.completed);
      } else {
        throw new Error("La transcripción falló");
      }
    } catch (error) {
      console.error("Error durante la transcripción:", error);
      setTranscription(STATUS_MESSAGES.error);
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <section
        className="flex flex-row gap-2 p-4 bg-gray-100 rounded-lg items-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => fileInputRef.current?.click()}
      >
        <FileAudioIcon className="w-8 h-8" />
        <span>Sube tu audio</span>
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
      </section>

      {loading && <p className="mt-4 text-gray-500">{statusMessage}</p>}

      {transcription && (
        <section className="mt-4 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-bold">Transcripción:</h2>
          <p className="text-gray-700 mt-2">{transcription}</p>
        </section>
      )}
    </main>
  );
}

export default App;
