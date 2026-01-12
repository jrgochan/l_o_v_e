"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const listener_1 = require("../../src/api/listener");
describe('Listener API', () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
    beforeEach(() => {
        jest.useRealTimers();
        mockFetch.mockReset();
        mockConsoleError.mockClear();
    });
    afterAll(() => {
        mockConsoleError.mockRestore();
    });
    describe('ListenerApiClient', () => {
        it('should analyze text successfully', async () => {
            const mockResponse = { emotion: 'joy', confidence: 0.9 };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });
            const client = new listener_1.ListenerApiClient();
            const result = await client.analyzeText('I am happy');
            expect(result).toEqual(mockResponse);
        });
        it('should handle text analysis errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Error'
            });
            const client = new listener_1.ListenerApiClient();
            await expect(client.analyzeText('test')).rejects.toThrow('Listener API error: 500 Internal Error');
        });
        it('should analyze audio successfully', async () => {
            const mockResponse = { emotion: 'joy' };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });
            const client = new listener_1.ListenerApiClient();
            const blob = new Blob(['audio'], { type: 'audio/wav' });
            const result = await client.analyzeAudio(blob);
            expect(result).toEqual(mockResponse);
        });
        it('should handle audio analysis errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Bad Request'
            });
            const client = new listener_1.ListenerApiClient();
            const blob = new Blob([''], { type: 'audio/wav' });
            await expect(client.analyzeAudio(blob)).rejects.toThrow('Listener API error: 400 Bad Request');
        });
        it('should health check pass', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true });
            const client = new listener_1.ListenerApiClient();
            expect(await client.healthCheck()).toBe(true);
        });
        it('should health check fail', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Fail'));
            const client = new listener_1.ListenerApiClient();
            expect(await client.healthCheck()).toBe(false);
        });
        it('should get detailed health status', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ status: 'ok' })
            });
            const client = new listener_1.ListenerApiClient();
            const result = await client.getHealthStatus();
            expect(result).toEqual({ status: 'ok' });
        });
        it('should fail detailed health status', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
            const client = new listener_1.ListenerApiClient();
            await expect(client.getHealthStatus()).rejects.toThrow('Health check failed: 500');
        });
        it('should retry on network failure', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Net fail'))
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
            const client = new listener_1.ListenerApiClient({ retryDelay: 1 });
            const result = await client.analyzeText('test');
            expect(result).toBeDefined();
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
        it('should throw after max retries', async () => {
            mockFetch.mockRejectedValue(new Error('Persistent Fail'));
            const client = new listener_1.ListenerApiClient({ retryAttempts: 2, retryDelay: 1 });
            await expect(client.analyzeText('test')).rejects.toThrow('Persistent Fail');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
        it('updateConfig should update configuration', () => {
            const client = new listener_1.ListenerApiClient();
            client.updateConfig({ retryAttempts: 99 });
        });
    });
    describe('Helpers', () => {
        it('getListenerClient singleton and update', () => {
            const c1 = (0, listener_1.getListenerClient)();
            const c2 = (0, listener_1.getListenerClient)();
            expect(c1).toBe(c2);
            (0, listener_1.getListenerClient)({ retryAttempts: 5 });
        });
        it('convertListenerVAC', () => { (0, listener_1.convertListenerVAC)({ valence: 0, arousal: 0, connection: 0 }); });
        it('analyzeText', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
            await (0, listener_1.analyzeText)('t');
        });
    });
});
//# sourceMappingURL=listener.test.js.map