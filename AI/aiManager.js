'use strict';

const config = require('./config');
const OpenRouterClient = require('./openrouter/openRouterClient');
const ModelManager = require('./modelManager');
const FallbackManager = require('./fallbackManager');
const RateLimitManager = require('./rateLimitManager');
const ContextManager = require('./contextManager');
const MemoryManager = require('./memoryManager');
const responseManager = require('./responseManager');
const AIRouter = require('./aiRouter');
const taskManager = require('./taskManager');

class AIManager {

    constructor(options = {}) {

        // ---------------------------------------------------------
        // MODEL SYSTEM
        // ---------------------------------------------------------

        this.modelManager = new ModelManager();

        // ---------------------------------------------------------
        // OPENROUTER CLIENT
        // ---------------------------------------------------------

        this.client = new OpenRouterClient(options);

        // ---------------------------------------------------------
        // FALLBACK SYSTEM
        // ---------------------------------------------------------

        this.fallbackManager =
            new FallbackManager(
                this.modelManager
            );

        // ---------------------------------------------------------
        // SUPPORT SERVICES
        // ---------------------------------------------------------

        this.rateLimitManager =
            new RateLimitManager();

        this.contextManager =
            new ContextManager();

        this.memoryManager =
            new MemoryManager();

        // ---------------------------------------------------------
        // AI ROUTER
        // ---------------------------------------------------------

        this.router =
            new AIRouter({

                modelManager:
                    this.modelManager,

                client:
                    this.client,

                fallbackManager:
                    this.fallbackManager,

                rateLimitManager:
                    this.rateLimitManager,

                contextManager:
                    this.contextManager,

                memoryManager:
                    this.memoryManager,

                responseManager
            });
    }


    // ============================================================
    // STATUS
    // ============================================================

    status() {

        const active =
            this.modelManager.getActive();

        return {

            provider:
                config.provider,

            configured:
                this.client.isConfigured(),

            model:
                active
                    ? active.id
                    : null,

            modelName:
                active
                    ? active.name
                    : null,

            mode:
                this.modelManager.getMode(),

            tasks:
                taskManager.listTasks()
        };
    }


    // ============================================================
    // CHAT
    // ============================================================

    chat(params) {

        return this.router.run(params);
    }


    // ============================================================
    // MEMORY
    // ============================================================

    clearMemory(
        sessionId = 'default'
    ) {

        this.memoryManager.clear(
            sessionId
        );
    }


    // ============================================================
    // MODEL LIST
    // ============================================================

    listModels() {

        return this.modelManager.list();
    }


    // ============================================================
    // ACTIVE MODEL
    // ============================================================

    getActiveModel() {

        return this.modelManager.getActive();
    }


    getActiveModelId() {

        return this.modelManager.getActiveId();
    }


    // ============================================================
    // SET MODEL
    // ============================================================

    setModel(modelId) {

        return this.modelManager.setActive(
            modelId
        );
    }


    resetModel() {

        return this.modelManager.resetActive();
    }


    // ============================================================
    // MODEL MODE
    // ============================================================

    getModelMode() {

        return this.modelManager.getMode();
    }


    setModelMode(mode) {

        return this.modelManager.setMode(
            mode
        );
    }


    resetModelMode() {

        return this.modelManager.resetMode();
    }


    // ============================================================
    // COMPLETE MODEL SELECTION STATE
    // ============================================================

    getModelSelectionState() {

        return this.modelManager
            .getSelectionState();
    }


    // ============================================================
    // MODEL INFORMATION
    // ============================================================

    getModelInfo(modelId) {

        return this.modelManager.getInfo(
            modelId
        );
    }


    getAllModelInfo() {

        return this.modelManager
            .getAllInfo();
    }


    // ============================================================
    // MODEL CATEGORIES
    // ============================================================

    listPrimaryModels() {

        return this.modelManager
            .listPrimary();
    }


    listFallbackModels() {

        return this.modelManager
            .listFallback();
    }


    listAutomaticModels() {

        return this.modelManager
            .listAutomatic();
    }


    listFreeModels() {

        return this.modelManager
            .listFree();
    }


    listPaidModels() {

        return this.modelManager
            .listPaid();
    }


    // ============================================================
    // ROUTERS
    // ============================================================

    listRouters() {

        return this.modelManager
            .listRouters();
    }


    getRouter(routerId) {

        return this.modelManager
            .getRouter(routerId);
    }


    // ============================================================
    // AVAILABLE MODELS
    // ============================================================

    listAvailableModels() {

        return this.modelManager
            .listAvailable();
    }


    listAvailablePrimaryModels() {

        return this.modelManager
            .listAvailablePrimary();
    }


    listAvailableFallbackModels() {

        return this.modelManager
            .listAvailableFallback();
    }


    // ============================================================
    // MODEL VALIDATION
    // ============================================================

    validateModel(modelId) {

        return this.modelManager
            .validate(modelId);
    }
}


module.exports = AIManager;