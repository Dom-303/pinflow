<script setup lang="ts">
/**
 * App.vue - Main application shell
 *
 * Provides sidebar navigation + main content area layout.
 * Mirrors the structure of the React test fixture.
 */
import { ref, computed, markRaw, type Component } from 'vue';
import Navigation from './Navigation.vue';

// Import all test components
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

interface ComponentConfig {
  id: string;
  title: string;
  description: string;
  component: Component;
}

const components: ComponentConfig[] = [
  {
    id: 'async-components',
    title: 'Async Components',
    description: 'Async Components test component.',
    component: markRaw(AsyncComponents),
  },
  {
    id: 'basic-elements',
    title: 'Basic Elements',
    description: 'Basic Elements test component.',
    component: markRaw(BasicElements),
  },
  {
    id: 'composables',
    title: 'Composables',
    description: 'Composables test component.',
    component: markRaw(Composables),
  },
  {
    id: 'composition-vs-options',
    title: 'Composition Vs Options',
    description: 'Composition Vs Options test component.',
    component: markRaw(CompositionVsOptions),
  },
  {
    id: 'conditional-rendering',
    title: 'Conditional Rendering',
    description: 'Conditional Rendering test component.',
    component: markRaw(ConditionalRendering),
  },
  {
    id: 'custom-directives',
    title: 'Custom Directives',
    description: 'Custom Directives test component.',
    component: markRaw(CustomDirectives),
  },
  {
    id: 'deeply-nested',
    title: 'Deeply Nested',
    description: 'Deeply Nested test component.',
    component: markRaw(DeeplyNested),
  },
  {
    id: 'dynamic-components',
    title: 'Dynamic Components',
    description: 'Dynamic Components test component.',
    component: markRaw(DynamicComponents),
  },
  {
    id: 'dynamic-content',
    title: 'Dynamic Content',
    description: 'Dynamic Content test component.',
    component: markRaw(DynamicContent),
  },
  {
    id: 'error-handling',
    title: 'Error Handling',
    description: 'Error Handling test component.',
    component: markRaw(ErrorHandling),
  },
  {
    id: 'event-handlers',
    title: 'Event Handlers',
    description: 'Event Handlers test component.',
    component: markRaw(EventHandlers),
  },
  {
    id: 'keep-alive',
    title: 'Keep Alive',
    description: 'Keep Alive test component.',
    component: markRaw(KeepAlive),
  },
  {
    id: 'mixins',
    title: 'Mixins',
    description: 'Mixins test component.',
    component: markRaw(Mixins),
  },
  {
    id: 'props-and-emits',
    title: 'Props And Emits',
    description: 'Props And Emits test component.',
    component: markRaw(PropsAndEmits),
  },
  {
    id: 'provide-inject',
    title: 'Provide Inject',
    description: 'Provide Inject test component.',
    component: markRaw(ProvideInject),
  },
  {
    id: 'reactivity-system',
    title: 'Reactivity System',
    description: 'Reactivity System test component.',
    component: markRaw(ReactivitySystem),
  },
  {
    id: 'render-functions',
    title: 'Render Functions',
    description: 'Render Functions test component.',
    component: markRaw(RenderFunctions),
  },
  {
    id: 'self-closing',
    title: 'Self Closing',
    description: 'Self Closing test component.',
    component: markRaw(SelfClosing),
  },
  {
    id: 'slots',
    title: 'Slots',
    description: 'Slots test component.',
    component: markRaw(Slots),
  },
  {
    id: 'smoke-test',
    title: 'Smoke Test',
    description: 'Smoke Test test component.',
    component: markRaw(SmokeTest),
  },
  {
    id: 'suspense',
    title: 'Suspense',
    description: 'Suspense test component.',
    component: markRaw(Suspense),
  },
  {
    id: 'teleport',
    title: 'Teleport',
    description: 'Teleport test component.',
    component: markRaw(Teleport),
  },
  {
    id: 'template-refs',
    title: 'Template Refs',
    description: 'Template Refs test component.',
    component: markRaw(TemplateRefs),
  },
  {
    id: 'transitions',
    title: 'Transitions',
    description: 'Transitions test component.',
    component: markRaw(Transitions),
  },
  {
    id: 'two-way-binding',
    title: 'Two Way Binding',
    description: 'Two Way Binding test component.',
    component: markRaw(TwoWayBinding),
  },
  {
    id: 'type-script-features',
    title: 'Type Script Features',
    description: 'Type Script Features test component.',
    component: markRaw(TypeScriptFeatures),
  },
  {
    id: 'v-for',
    title: 'V For',
    description: 'V For test component.',
    component: markRaw(VFor),
  },
  {
    id: 'watchers',
    title: 'Watchers',
    description: 'Watchers test component.',
    component: markRaw(Watchers),
  },
];

const activeComponent = ref('async-components');

const currentComponent = computed(() => {
  return (
    components.find((c) => c.id === activeComponent.value) || components[0]
  );
});

function handleNavigate(id: string) {
  activeComponent.value = id;
}
</script>

<template>
  <div class="app">
    <Navigation :active-item="activeComponent" @navigate="handleNavigate" />

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

<style scoped>
/* Styles are in index.css */
</style>
