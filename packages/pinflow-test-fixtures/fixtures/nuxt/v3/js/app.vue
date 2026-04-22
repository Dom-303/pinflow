<script setup lang="ts">
import Navigation from './components/Navigation.vue';
import AsyncComponents from './components/AsyncComponents.vue';
import BasicElements from './components/BasicElements.vue';
import Composables from './components/Composables.vue';
import CompositionVsOptions from './components/CompositionVsOptions.vue';
import ConditionalRendering from './components/ConditionalRendering.vue';
import CustomDirectives from './components/CustomDirectives.vue';
import DeeplyNested from './components/DeeplyNested.vue';
import DynamicComponents from './components/DynamicComponents.vue';
import DynamicContent from './components/DynamicContent.vue';
import ErrorHandling from './components/ErrorHandling.vue';
import EventHandlers from './components/EventHandlers.vue';
import KeepAlive from './components/KeepAlive.vue';
import Mixins from './components/Mixins.vue';
import PropsAndEmits from './components/PropsAndEmits.vue';
import ProvideInject from './components/ProvideInject.vue';
import ReactivitySystem from './components/ReactivitySystem.vue';
import RenderFunctions from './components/RenderFunctions.vue';
import SelfClosing from './components/SelfClosing.vue';
import Slots from './components/Slots.vue';
import SmokeTest from './components/SmokeTest.vue';
import Suspense from './components/Suspense.vue';
import Teleport from './components/Teleport.vue';
import TemplateRefs from './components/TemplateRefs.vue';
import Transitions from './components/Transitions.vue';
import TwoWayBinding from './components/TwoWayBinding.vue';
import TypeScriptFeatures from './components/TypeScriptFeatures.vue';
import VFor from './components/VFor.vue';
import Watchers from './components/Watchers.vue';
import AutoImports from './components/AutoImports.vue';
import Middleware from './components/Middleware.vue';
import NuxtIsland from './components/NuxtIsland.vue';
import NuxtLayout from './components/NuxtLayout.vue';
import NuxtPlugins from './components/NuxtPlugins.vue';
import ServerRoutes from './components/ServerRoutes.vue';
import StateManagement from './components/StateManagement.vue';
import UseFetch from './components/UseFetch.vue';

interface ComponentConfig {
  id: string;
  title: string;
  description: string;
  component: ReturnType<typeof defineComponent> | object;
}

const components: ComponentConfig[] = [
  {
    id: 'async-components',
    title: 'Async Components',
    description: 'Async Components test component.',
    component: AsyncComponents,
  },
  {
    id: 'basic-elements',
    title: 'Basic Elements',
    description: 'Basic Elements test component.',
    component: BasicElements,
  },
  {
    id: 'composables',
    title: 'Composables',
    description: 'Composables test component.',
    component: Composables,
  },
  {
    id: 'composition-vs-options',
    title: 'Composition Vs Options',
    description: 'Composition Vs Options test component.',
    component: CompositionVsOptions,
  },
  {
    id: 'conditional-rendering',
    title: 'Conditional Rendering',
    description: 'Conditional Rendering test component.',
    component: ConditionalRendering,
  },
  {
    id: 'custom-directives',
    title: 'Custom Directives',
    description: 'Custom Directives test component.',
    component: CustomDirectives,
  },
  {
    id: 'deeply-nested',
    title: 'Deeply Nested',
    description: 'Deeply Nested test component.',
    component: DeeplyNested,
  },
  {
    id: 'dynamic-components',
    title: 'Dynamic Components',
    description: 'Dynamic Components test component.',
    component: DynamicComponents,
  },
  {
    id: 'dynamic-content',
    title: 'Dynamic Content',
    description: 'Dynamic Content test component.',
    component: DynamicContent,
  },
  {
    id: 'error-handling',
    title: 'Error Handling',
    description: 'Error Handling test component.',
    component: ErrorHandling,
  },
  {
    id: 'event-handlers',
    title: 'Event Handlers',
    description: 'Event Handlers test component.',
    component: EventHandlers,
  },
  {
    id: 'keep-alive',
    title: 'Keep Alive',
    description: 'Keep Alive test component.',
    component: KeepAlive,
  },
  {
    id: 'mixins',
    title: 'Mixins',
    description: 'Mixins test component.',
    component: Mixins,
  },
  {
    id: 'props-and-emits',
    title: 'Props And Emits',
    description: 'Props And Emits test component.',
    component: PropsAndEmits,
  },
  {
    id: 'provide-inject',
    title: 'Provide Inject',
    description: 'Provide Inject test component.',
    component: ProvideInject,
  },
  {
    id: 'reactivity-system',
    title: 'Reactivity System',
    description: 'Reactivity System test component.',
    component: ReactivitySystem,
  },
  {
    id: 'render-functions',
    title: 'Render Functions',
    description: 'Render Functions test component.',
    component: RenderFunctions,
  },
  {
    id: 'self-closing',
    title: 'Self Closing',
    description: 'Self Closing test component.',
    component: SelfClosing,
  },
  {
    id: 'slots',
    title: 'Slots',
    description: 'Slots test component.',
    component: Slots,
  },
  {
    id: 'smoke-test',
    title: 'Smoke Test',
    description: 'Smoke Test test component.',
    component: SmokeTest,
  },
  {
    id: 'suspense',
    title: 'Suspense',
    description: 'Suspense test component.',
    component: Suspense,
  },
  {
    id: 'teleport',
    title: 'Teleport',
    description: 'Teleport test component.',
    component: Teleport,
  },
  {
    id: 'template-refs',
    title: 'Template Refs',
    description: 'Template Refs test component.',
    component: TemplateRefs,
  },
  {
    id: 'transitions',
    title: 'Transitions',
    description: 'Transitions test component.',
    component: Transitions,
  },
  {
    id: 'two-way-binding',
    title: 'Two Way Binding',
    description: 'Two Way Binding test component.',
    component: TwoWayBinding,
  },
  {
    id: 'type-script-features',
    title: 'Type Script Features',
    description: 'Type Script Features test component.',
    component: TypeScriptFeatures,
  },
  {
    id: 'v-for',
    title: 'V For',
    description: 'V For test component.',
    component: VFor,
  },
  {
    id: 'watchers',
    title: 'Watchers',
    description: 'Watchers test component.',
    component: Watchers,
  },
  {
    id: 'auto-imports',
    title: 'Auto Imports',
    description: 'Auto Imports test component.',
    component: AutoImports,
  },
  {
    id: 'middleware',
    title: 'Middleware',
    description: 'Middleware test component.',
    component: Middleware,
  },
  {
    id: 'nuxt-island',
    title: 'Nuxt Island',
    description: 'Nuxt Island test component.',
    component: NuxtIsland,
  },
  {
    id: 'nuxt-layout',
    title: 'Nuxt Layout',
    description: 'Nuxt Layout test component.',
    component: NuxtLayout,
  },
  {
    id: 'nuxt-plugins',
    title: 'Nuxt Plugins',
    description: 'Nuxt Plugins test component.',
    component: NuxtPlugins,
  },
  {
    id: 'server-routes',
    title: 'Server Routes',
    description: 'Server Routes test component.',
    component: ServerRoutes,
  },
  {
    id: 'state-management',
    title: 'State Management',
    description: 'State Management test component.',
    component: StateManagement,
  },
  {
    id: 'use-fetch',
    title: 'Use Fetch',
    description: 'Use Fetch test component.',
    component: UseFetch,
  },
];

const activeComponent = ref('async-components');

const currentComponent = computed(
  () => components.find((c) => c.id === activeComponent.value) || components[0],
);
</script>

<template>
  <div class="app">
    <Navigation
      :active-item="activeComponent"
      @navigate="activeComponent = $event"
    />

    <main class="main-content">
      <div class="content-wrapper">
        <header class="page-header">
          <h1 class="page-title">{{ currentComponent.title }}</h1>
          <p class="page-description">{{ currentComponent.description }}</p>
        </header>

        <div class="component-section">
          <component :is="currentComponent.component" />
        </div>
      </div>
    </main>
  </div>
</template>

<style>
@import './assets/index.css';
</style>
