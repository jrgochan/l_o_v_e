"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const observer_1 = require("../../src/api/observer");
describe('Observer API', () => {
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
    describe('ObserverApiClient', () => {
        it('should fetch current state successfully', async () => {
            const mockData = { user_id: '123', vac_vector: [0.5, 0.5, 0.5] };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockData
            });
            const client = new observer_1.ObserverApiClient();
            const result = await client.getCurrentState('123');
            expect(result).toEqual(mockData);
        });
        it('should retry on failure', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });
            const client = new observer_1.ObserverApiClient({ retryDelay: 1 });
            const result = await client.getCurrentState('123');
            expect(result).toEqual({ success: true });
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
        it('should throw after max retries', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const client = new observer_1.ObserverApiClient({ retryAttempts: 2, retryDelay: 1 });
            await expect(client.getCurrentState('123')).rejects.toThrow('Network error');
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
        it('should handle API errors (non-200)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found'
            });
            const client = new observer_1.ObserverApiClient();
            await expect(client.getCurrentState('123')).rejects.toThrow('Observer API error: 404 Not Found');
        });
        it('should get history with default params', async () => {
            const mockHistory = { user_id: 'u1', states: [], total_count: 0 };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistory
            });
            const client = new observer_1.ObserverApiClient();
            const result = await client.getHistory('u1');
            expect(result).toEqual(mockHistory);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=100'), expect.anything());
        });
        it('should get history with custom params', async () => {
            const mockHistory = { user_id: 'u1', states: [], total_count: 0 };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistory
            });
            const client = new observer_1.ObserverApiClient();
            await client.getHistory('u1', 50, 10);
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=50&offset=10'), expect.anything());
        });
        it('should handle transition path API error response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: async () => ({ detail: 'Invalid VAC' })
            });
            const client = new observer_1.ObserverApiClient();
            await expect(client.generateTransitionPath('u1', [0, 0, 0], [1, 1, 1])).rejects.toThrow('Invalid VAC');
        });
        it('should generate transition path with defaults', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ path_id: '1' })
            });
            const client = new observer_1.ObserverApiClient();
            await client.generateTransitionPath('u1', [0, 0, 0], [1, 1, 1]);
        });
        it('should handle transition path API error response without detail', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request',
                json: async () => ({})
            });
            const client = new observer_1.ObserverApiClient();
            await expect(client.generateTransitionPath('u1', [0, 0, 0], [1, 1, 1])).rejects.toThrow('API error: Bad Request');
        });
        const methodsToTest = [
            ['getHistory', ['u1']],
            ['loadEmotionAtlas', []],
            ['loadEmotionAtlas', ['joy']],
            ['startJourney', ['u1', 'p1']],
            ['startJourney', ['u1', 'p1', { foo: 'bar' }]],
            ['getBootstrapStrategyRatings', []],
            ['getBootstrapPathTemplates', []],
            ['getBootstrapPathTemplates', ['joy', 'sadness', 5]],
            ['getContextRecommendations', [{}]],
            ['getContextRecommendations', [{
                        time_of_day: 'morning',
                        energy_level: 'high',
                        location: 'home',
                        available_time: '5_minutes',
                        experience_level: 'beginner'
                    }]],
            ['getChallengePatterns', []],
            ['getChallengePatterns', ['challenge1']],
            ['getAllBootstrapData', []],
            ['getUserEffectiveStrategies', ['u1']],
            ['getUserEffectiveStrategies', ['u1', 10]],
            ['getUserJourneyHistory', ['u1']]
        ];
        methodsToTest.forEach(([method, args]) => {
            it(`${method} should handle network error`, async () => {
                mockFetch.mockRejectedValueOnce(new Error('Network Fail'));
                const client = new observer_1.ObserverApiClient({ retryAttempts: 1 });
                await expect(client[method](...args)).rejects.toThrow('Network Fail');
            });
            it(`${method} should handle non-200 error`, async () => {
                mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Err' });
                const client = new observer_1.ObserverApiClient();
                await expect(client[method](...args)).rejects.toThrow(/Observer API error: 500/);
            });
            it(`${method} success`, async () => {
                mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
                const client = new observer_1.ObserverApiClient();
                await client[method](...args);
            });
        });
        it('healthCheck should return false on error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Fail'));
            const client = new observer_1.ObserverApiClient();
            expect(await client.healthCheck()).toBe(false);
        });
        it('healthCheck should return true on success', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true });
            const client = new observer_1.ObserverApiClient();
            expect(await client.healthCheck()).toBe(true);
        });
        it('updateConfig should update configuration', () => {
            const client = new observer_1.ObserverApiClient();
            client.updateConfig({ retryAttempts: 99 });
        });
    });
    describe('ObserverPollingManager', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });
        afterEach(() => {
            jest.useRealTimers();
        });
        it('should start and stop polling', async () => {
            const client = new observer_1.ObserverApiClient();
            const manager = (0, observer_1.createPollingManager)();
            const mockData = { success: true };
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockData
            });
            const onUpdate = jest.fn();
            manager.start('u1', onUpdate, undefined, 100);
            expect(manager.isActive()).toBe(true);
            expect(mockFetch).toHaveBeenCalled();
            await jest.advanceTimersByTimeAsync(100);
            expect(mockFetch).toHaveBeenCalledTimes(2);
            manager.stop();
            expect(manager.isActive()).toBe(false);
        });
        it('should handle polling errors', async () => {
            const manager = (0, observer_1.createPollingManager)();
            mockFetch.mockRejectedValue(new Error('Poll fail'));
            const onError = jest.fn();
            manager.start('u1', () => { }, onError, 100);
            await jest.runOnlyPendingTimersAsync();
            await Promise.resolve();
            expect(onError).toHaveBeenCalled();
            manager.stop();
        });
        it('should prevent double start (coverage)', () => {
            const manager = (0, observer_1.createPollingManager)();
            manager.start('u1', () => { });
            manager.start('u1', () => { });
            expect(manager.isActive()).toBe(true);
            manager.stop();
        });
        it('stop should be idempotent', () => {
            const manager = (0, observer_1.createPollingManager)();
            manager.stop();
            expect(manager.isActive()).toBe(false);
        });
        it('poll should not execute if not polling', async () => {
            const manager = (0, observer_1.createPollingManager)();
            await manager.poll('u1');
            expect(mockFetch).not.toHaveBeenCalled();
        });
        it('should handle race condition where stop is called during poll', async () => {
            const client = new observer_1.ObserverApiClient();
            const manager = new observer_1.ObserverPollingManager(client);
            let resolveState;
            const statePromise = new Promise(resolve => { resolveState = resolve; });
            jest.spyOn(client, 'getCurrentState').mockImplementation(() => statePromise);
            jest.spyOn(client, 'cancel').mockImplementation(() => { });
            const onUpdate = jest.fn();
            manager.start('u1', onUpdate);
            manager.stop();
            resolveState({ user_id: 'u1' });
            await Promise.resolve();
            expect(onUpdate).not.toHaveBeenCalled();
        });
    });
    describe('Helpers', () => {
        it('getObserverClient singleton and update', () => {
            const c1 = (0, observer_1.getObserverClient)();
            const c2 = (0, observer_1.getObserverClient)();
            expect(c1).toBe(c2);
            (0, observer_1.getObserverClient)({ retryAttempts: 5 });
        });
        it('createPollingManager helper', () => {
            (0, observer_1.createPollingManager)();
        });
        it('convertQuaternion', () => { (0, observer_1.convertQuaternion)({ w: 1, x: 0, y: 0, z: 0 }); });
        it('convertVAC', () => { (0, observer_1.convertVAC)([0, 0, 0]); });
        it('fetchCurrentState', async () => {
            mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
            await (0, observer_1.fetchCurrentState)('u1');
        });
        it('generateMockResponse', () => { (0, observer_1.generateMockResponse)('u1'); });
    });
});
//# sourceMappingURL=observer.test.js.map