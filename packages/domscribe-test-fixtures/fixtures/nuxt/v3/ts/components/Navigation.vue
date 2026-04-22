<script setup lang="ts">
/**
 * Navigation Component
 * Sidebar navigation for test fixture showcase
 */

interface NavItem {
  id: string;
  label: string;
  section?: string;
}

const props = defineProps<{
  activeItem: string;
}>();

const emit = defineEmits<{
  navigate: [id: string];
}>();

const navItems: NavItem[] = [
  {
    id: 'async-components',
    label: 'Async Components',
    section: 'Advanced Patterns',
  },
  { id: 'basic-elements', label: 'Basic Elements', section: 'Core Patterns' },
  { id: 'composables', label: 'Composables', section: 'Advanced Patterns' },
  {
    id: 'composition-vs-options',
    label: 'Composition Vs Options',
    section: 'Advanced Patterns',
  },
  {
    id: 'conditional-rendering',
    label: 'Conditional Rendering',
    section: 'Core Patterns',
  },
  {
    id: 'custom-directives',
    label: 'Custom Directives',
    section: 'Advanced Patterns',
  },
  { id: 'deeply-nested', label: 'Deeply Nested', section: 'Core Patterns' },
  {
    id: 'dynamic-components',
    label: 'Dynamic Components',
    section: 'Advanced Patterns',
  },
  { id: 'dynamic-content', label: 'Dynamic Content', section: 'Core Patterns' },
  {
    id: 'error-handling',
    label: 'Error Handling',
    section: 'Advanced Patterns',
  },
  { id: 'event-handlers', label: 'Event Handlers', section: 'Core Patterns' },
  { id: 'keep-alive', label: 'Keep Alive', section: 'Advanced Patterns' },
  { id: 'mixins', label: 'Mixins', section: 'Advanced Patterns' },
  {
    id: 'props-and-emits',
    label: 'Props And Emits',
    section: 'Advanced Patterns',
  },
  {
    id: 'provide-inject',
    label: 'Provide Inject',
    section: 'Advanced Patterns',
  },
  {
    id: 'reactivity-system',
    label: 'Reactivity System',
    section: 'Advanced Patterns',
  },
  {
    id: 'render-functions',
    label: 'Render Functions',
    section: 'Advanced Patterns',
  },
  { id: 'self-closing', label: 'Self Closing', section: 'Core Patterns' },
  { id: 'slots', label: 'Slots', section: 'Advanced Patterns' },
  { id: 'smoke-test', label: 'Smoke Test', section: 'Testing' },
  { id: 'suspense', label: 'Suspense', section: 'Advanced Patterns' },
  { id: 'teleport', label: 'Teleport', section: 'Advanced Patterns' },
  { id: 'template-refs', label: 'Template Refs', section: 'Core Patterns' },
  { id: 'transitions', label: 'Transitions', section: 'Advanced Patterns' },
  { id: 'two-way-binding', label: 'Two Way Binding', section: 'Core Patterns' },
  {
    id: 'type-script-features',
    label: 'Type Script Features',
    section: 'Core Patterns',
  },
  { id: 'v-for', label: 'V For', section: 'Core Patterns' },
  { id: 'watchers', label: 'Watchers', section: 'Advanced Patterns' },
  { id: 'auto-imports', label: 'Auto Imports', section: 'Core Patterns' },
  { id: 'middleware', label: 'Middleware', section: 'Advanced Patterns' },
  { id: 'nuxt-island', label: 'Nuxt Island', section: 'Advanced Patterns' },
  { id: 'nuxt-layout', label: 'Nuxt Layout', section: 'Core Patterns' },
  { id: 'nuxt-plugins', label: 'Nuxt Plugins', section: 'Advanced Patterns' },
  { id: 'server-routes', label: 'Server Routes', section: 'Advanced Patterns' },
  {
    id: 'state-management',
    label: 'State Management',
    section: 'Advanced Patterns',
  },
  { id: 'use-fetch', label: 'Use Fetch', section: 'Advanced Patterns' },
];

const sections = computed(() => [
  ...new Set(navItems.map((item) => item.section)),
]);
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">P</div>
        <span class="sidebar-logo-text">PinFlow Workspace</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div v-for="section in sections" :key="section" class="sidebar-section">
        <div class="sidebar-section-title">{{ section }}</div>
        <div
          v-for="item in navItems.filter((i) => i.section === section)"
          :key="item.id"
          :data-page-id="item.id"
          :class="[
            'sidebar-link',
            props.activeItem === item.id ? 'active' : '',
          ]"
          @click="emit('navigate', item.id)"
        >
          {{ item.label }}
        </div>
      </div>
    </nav>
  </div>
</template>
