import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive, type ExtractPropDefaultTypes } from '../../../../../../lib/Reactive';
import { nestedProps } from '../../../../../../lib/nestedProps';
import { Static } from '../../../../../../lib/Static';
import { Kit } from '@kit/Kit';
import { Snippet } from './Snippet';
import SnippetView from './Snippet.vue';

// The root of the demo tree: a gallery of snippet cards. Its kit names
// one role, and an override two levels down reaches the code block
// inside every card through it.
class $Gallery {
  static get $kit() {
    return {
      Snippet: { namespace: Snippet, vue: SnippetView },
    } satisfies Kit.Of<'Snippet'>;
  }

  /** the snippets a gallery shows when its parent passes none: a counter, its view, its style */
  static get SAMPLES(): Snippet.Source[] {
    return [
      {
        name: 'Counter.vue',
        lang: 'vue',
        code: [
          '<script setup lang="ts">',
          "import { Counter } from './Counter';",
          '',
          'const counter = new Counter.Class();',
          '',
          'const { count } = counter;',
          '</script>',
          '',
          '<template>',
          '  <button class="counter" @click="counter.increment()">',
          '    {{ count }} × 2 = {{ counter.doubled }}',
          '  </button>',
          '</template>',
        ].join('\n'),
      },
      {
        name: 'counter.css',
        lang: 'css',
        code: [
          '.counter {',
          '  display: inline-flex;',
          '  gap: 8px;',
          '  padding: 6px 12px;',
          '  border-radius: 999px;',
          '  background: var(--brand-soft);',
          '}',
          '',
          '.counter:hover {',
          '  background: var(--brand);',
          '  color: white;',
          '}',
        ].join('\n'),
      },
      {
        name: 'Counter.ts',
        lang: 'typescript',
        code: [
          "import { ref } from 'vue';",
          "import { Reactive } from 'ivue';",
          '',
          'class $Counter {',
          '  get count() {',
          '    return ref(0);',
          '  }',
          '',
          '  get doubled() {',
          '    return this.count.value * 2;',
          '  }',
          '',
          '  increment() {',
          '    this.count.value++;',
          '  }',
          '}',
          '',
          'export namespace Counter {',
          '  export const $Class = $Counter;',
          '  export let Class = Reactive($Class);',
          '}',
        ].join('\n'),
      },
    ];
  }

  static get propsTypes() {
    return definePropTypes({
      snippets: { type: Array as PropType<Snippet.Source[]> },
      kit: { type: Object as PropType<Kit.Entry<typeof Gallery>> },
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $Gallery.propsTypes> {
    return { snippets: this.SAMPLES, kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: Gallery.Props) {
    nestedProps(props, this.self.propsDefaults);
  }

  protected get self() {
    return this.constructor as typeof $Gallery;
  }

  get kit() {
    return this.self.$kit;
  }

  get snippets(): Snippet.Source[] {
    return this.props.snippets;
  }
}

export namespace Gallery {
  export const $Class = Static($Gallery);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
