import { getAudioStream, processAudioBlob, stopStreamTracks } from "@/hooks/voice/utils/audioUtils";

// Mock global browser APIs
global.URL.createObjectURL = jest.fn(() => "mock-url");

// Fix for FileReader mock in JSDOM
class MockFileReader {
    readAsDataURL() {
        // Simulate async success
        setTimeout(() => {
            this.onloadend && this.onloadend();
        }, 0);
    }
    result = "data:audio/webm;base64,mockbase64data";
    onloadend: (() => void) | null = null;
    onerror: ((error: any) => void) | null = null;
}
(global as any).FileReader = MockFileReader;

describe("audioUtils", () => {
    describe("getAudioStream", () => {
        it("should request media stream with simple config", async () => {
            const mockStream = { getTracks: jest.fn() };
            const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);

            Object.defineProperty(global.navigator, 'mediaDevices', {
                value: { getUserMedia: mockGetUserMedia },
                writable: true
            });

            const stream = await getAudioStream();
            expect(stream).toBe(mockStream);
            expect(mockGetUserMedia).toHaveBeenCalledWith(expect.objectContaining({
                audio: expect.objectContaining({ echoCancellation: true })
            }));
        });

        it("should throw error if access denied", async () => {
            const mockGetUserMedia = jest.fn().mockRejectedValue(new Error("Denied"));
            Object.defineProperty(global.navigator, 'mediaDevices', {
                value: { getUserMedia: mockGetUserMedia },
                writable: true
            });

            await expect(getAudioStream()).rejects.toThrow("Denied");
        });
    });

    describe("processAudioBlob", () => {
        it("should convert chunks to blob and base64", async () => {
            const chunks = [new Blob(["test"], { type: "audio/webm" })];
            const result = await processAudioBlob(chunks);

            expect(result.url).toBe("mock-url");
            expect(result.base64).toBe("mockbase64data");
            expect(result.blob).toBeInstanceOf(Blob);
        });
    });

    describe("stopStreamTracks", () => {
        it("should stop all tracks", () => {
            const mockStop = jest.fn();
            const mockStream = {
                getTracks: jest.fn().mockReturnValue([{ stop: mockStop }, { stop: mockStop }])
            } as unknown as MediaStream;

            stopStreamTracks(mockStream);
            expect(mockStop).toHaveBeenCalledTimes(2);
        });

        it("should handle null stream", () => {
            expect(() => stopStreamTracks(null)).not.toThrow();
        });
    });
});
