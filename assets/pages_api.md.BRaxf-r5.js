import{_ as i,I as s,J as t,au as e}from"./chunks/framework.BdEz2lsW.js";const y=JSON.parse('{"title":"API","description":"","frontmatter":{},"headers":[],"relativePath":"pages/api.md","filePath":"pages/api.md"}'),a={name:"pages/api.md"},n=e('<h1 id="api" tabindex="-1">API <a class="header-anchor" href="#api" aria-label="Permalink to &quot;API&quot;">​</a></h1><h2 id="core-functions" tabindex="-1">Core Functions <a class="header-anchor" href="#core-functions" aria-label="Permalink to &quot;Core Functions&quot;">​</a></h2><h3 id="ivue" tabindex="-1"><code>ivue()</code> <a class="header-anchor" href="#ivue" aria-label="Permalink to &quot;`ivue()`&quot;">​</a></h3><hr><div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes one-light dracula-soft vp-code" style="--shiki-light:#383A42;--shiki-dark:#f6f6f4;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282A36;" tabindex="0"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;">export</span><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;"> function</span><span style="--shiki-light:#4078F2;--shiki-dark:#62E884;"> ivue</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;"> extends</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> AnyClass</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;(</span></span>\n<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">  className</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> T</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">,</span></span>\n<span class="line"><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">  ...</span><span style="--shiki-light:#383A42;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">args</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> InferredArgs</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;</span></span>\n<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">)</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> IVue</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;;</span></span></code></pre></div><p>Core <code>ivue(className, ...args)</code> initializer is able to infer and validate the constrcutor argument types of AnyClass and passes those arguments to the constructor of <code>AnyClass</code> internally.</p><p><code>ivue(className, arg1, arg2, arg3...)</code> allows you to pass any number of arguments into the class <code>constructor(arg1, arg2, arg3...)</code></p><p><code>ivue()</code> initializer function returns an extended Vue 3 <code>reactive()</code> object in which getters and setters are internally converted to computeds and adds <code>.toRefs()</code> method to the created object. Computeds auto-unwrap themselves when they are accessed as a reactive object property, so the <code>.value</code> properties and computeds get flattened in the resulting object and do not require <code>.value</code> to be accessed.</p><p><code>ivue()</code> replicates native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole prototype ancestors chain thus supporting classical inheritance.</p><p><strong>Returns:</strong> <code>&lt;IVue&lt;T&gt;&gt;</code> or <code>ivue</code> <code>reactive()</code> object of an <code>AnyClass</code> class with flattened (de-Refed) <code>Refs</code> and <code>ComputedRefs</code> as properties.</p><h3 id="iref" tabindex="-1"><code>iref()</code> <a class="header-anchor" href="#iref" aria-label="Permalink to &quot;`iref()`&quot;">​</a></h3><p>Is simply an alias to Vue 3 <code>ref()</code> function but casts the type to the internal unreactive type, because properties auto-unwrap in <code>reactive()</code> object that is being created by <code>ivue</code> upon initialization.</p><h3 id="ishallowref" tabindex="-1"><code>ishallowRef()</code> <a class="header-anchor" href="#ishallowref" aria-label="Permalink to &quot;`ishallowRef()`&quot;">​</a></h3><p>Is simply an alias Vue 3 <code>shallowRef()</code> function but casts the type to the internal unreactive type, because properties auto-unwrap in <code>reactive()</code> object that is being created by <code>ivue</code> upon initialization.</p><h3 id="iuse" tabindex="-1"><code>iuse()</code> <a class="header-anchor" href="#iuse" aria-label="Permalink to &quot;`iuse()`&quot;">​</a></h3><p>This function unwraps the type of any composable return to the bare values without <code>.value</code>, because properties auto-unwrap in <code>reactive()</code> object that is being created by <code>ivue</code> upon initialization.</p><h2 id="core-methods" tabindex="-1">Core Methods <a class="header-anchor" href="#core-methods" aria-label="Permalink to &quot;Core Methods&quot;">​</a></h2><h3 id="constructor" tabindex="-1"><code>constructor()</code> <a class="header-anchor" href="#constructor" aria-label="Permalink to &quot;`constructor()`&quot;">​</a></h3><p>Native Class API <code>constructor()</code> is mainly used to assign and cast Vue 3 Refs back to their original types. <code>constructor()</code> should not be used to work with reactive state. Use <code>.init()</code> for reactive purposes.</p><h3 id="init" tabindex="-1"><code>.init()</code> <a class="header-anchor" href="#init" aria-label="Permalink to &quot;`.init()`&quot;">​</a></h3><hr><p><code>.init()</code> method is auto-run on <code>ivue()</code> initialization after <code>constructor()</code> is run. <code>.init()</code> has access to the reactive state of the object via <code>this</code>.</p><div class="warning custom-block"><p class="custom-block-title">NOTICE</p><p><code>.init()</code> method has no arguments and you should never need to run this method manually.</p></div><div class="tip custom-block"><p class="custom-block-title">NEED ASYNC/AWAIT?</p><p>Use <code>async init()</code> if you need <code>await</code> functionality.</p></div><p><strong>Returns:</strong> <code>void | Promise&lt;void&gt;</code></p><h3 id="torefs" tabindex="-1"><code>.toRefs()</code> <a class="header-anchor" href="#torefs" aria-label="Permalink to &quot;`.toRefs()`&quot;">​</a></h3><hr><div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes one-light dracula-soft vp-code" style="--shiki-light:#383A42;--shiki-dark:#f6f6f4;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282A36;" tabindex="0"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;">function</span><span style="--shiki-light:#4078F2;--shiki-dark:#62E884;"> toRefs</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">(</span><span style="--shiki-light:#383A42;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">props</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">?:</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;"> (</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">keyof</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> InstanceType</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;)[])</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> IVueRefs</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">InstanceType</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;&gt;;</span></span></code></pre></div><p>Converts an <code>ivue</code> object to a Vue 3 Composable with nested refs.</p><div class="tip custom-block"><p class="custom-block-title">You can pass the name of the properties to <code>.toRefs(properties)</code></p><div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes one-light dracula-soft vp-code" style="--shiki-light:#383A42;--shiki-dark:#f6f6f4;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282A36;" tabindex="0"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;">const</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;"> { </span><span style="--shiki-light:#986801;--shiki-dark:#F6F6F4;">width</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">, </span><span style="--shiki-light:#986801;--shiki-dark:#F6F6F4;">height</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;"> } </span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">=</span><span style="--shiki-light:#4078F2;--shiki-dark:#62E884;"> ivue</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">(Box).</span><span style="--shiki-light:#4078F2;--shiki-dark:#62E884;">toRefs</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">([</span><span style="--shiki-light:#50A14F;--shiki-dark:#DEE492;">&#39;</span><span style="--shiki-light:#50A14F;--shiki-dark:#E7EE98;">width</span><span style="--shiki-light:#50A14F;--shiki-dark:#DEE492;">&#39;</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">, </span><span style="--shiki-light:#50A14F;--shiki-dark:#DEE492;">&#39;</span><span style="--shiki-light:#50A14F;--shiki-dark:#E7EE98;">height</span><span style="--shiki-light:#50A14F;--shiki-dark:#DEE492;">&#39;</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">]);</span></span></code></pre></div><p>This improves performance if <code>box</code> has many other properties that we do not need.</p></div><p><strong>Returns:</strong> <code>IVueRefs&lt;InstanceType&lt;T&gt;&gt;</code></p><h2 id="core-types" tabindex="-1">Core Types <a class="header-anchor" href="#core-types" aria-label="Permalink to &quot;Core Types&quot;">​</a></h2><h3 id="IVue" tabindex="-1"><code>IVue</code> <a class="header-anchor" href="#IVue" aria-label="Permalink to &quot;`IVue` {#IVue}&quot;">​</a></h3><h3 id="Use" tabindex="-1"><code>Use</code> <a class="header-anchor" href="#Use" aria-label="Permalink to &quot;`Use` {#Use}&quot;">​</a></h3><h2 id="utility-functions" tabindex="-1">Utility Functions <a class="header-anchor" href="#utility-functions" aria-label="Permalink to &quot;Utility Functions&quot;">​</a></h2><h3 id="propswithdefaults" tabindex="-1"><code>propsWithDefaults()</code> <a class="header-anchor" href="#propswithdefaults" aria-label="Permalink to &quot;`propsWithDefaults()`&quot;">​</a></h3><hr><div class="language-ts vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki shiki-themes one-light dracula-soft vp-code" style="--shiki-light:#383A42;--shiki-dark:#f6f6f4;--shiki-light-bg:#FAFAFA;--shiki-dark-bg:#282A36;" tabindex="0"><code><span class="line"><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;">export</span><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;"> function</span><span style="--shiki-light:#4078F2;--shiki-dark:#62E884;"> propsWithDefaults</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#A626A4;--shiki-dark:#F286C4;"> extends</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> VuePropsObject</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;(</span></span>\n<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">  defaults</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> Record</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#383A42;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">string</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">, </span><span style="--shiki-light:#383A42;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">any</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;,</span></span>\n<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">  typedProps</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> T</span></span>\n<span class="line"><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">)</span><span style="--shiki-light:#0184BC;--shiki-dark:#F286C4;">:</span><span style="--shiki-light:#C18401;--shiki-dark:#97E1F1;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;"> VuePropsWithDefaults</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&lt;</span><span style="--shiki-light:#C18401;--shiki-dark:#FFB86C;--shiki-light-font-style:inherit;--shiki-dark-font-style:italic;">T</span><span style="--shiki-light:#383A42;--shiki-dark:#F6F6F4;">&gt;;</span></span></code></pre></div><p>Combines statically written defaults object with the runtime type definition of Vue 3 props.</p><p><strong>Returns:</strong> <code>VuePropsWithDefaults&lt;T&gt;</code></p><h2 id="utility-types" tabindex="-1">Utility Types <a class="header-anchor" href="#utility-types" aria-label="Permalink to &quot;Utility Types&quot;">​</a></h2><hr><p>Extracts and unwraps (de-Refs) the real types of Vue 3 composable definition to make it compatible with <code>ivue</code>.</p><h3 id="extractpropdefaulttypes" tabindex="-1"><code>ExtractPropDefaultTypes</code> <a class="header-anchor" href="#extractpropdefaulttypes" aria-label="Permalink to &quot;`ExtractPropDefaultTypes`&quot;">​</a></h3><p>Extracts types of the default types definition. This type can be used to validate against the actual defaults definition to make sure both definitions are in sync.</p><hr><h3 id="extractemittypes" tabindex="-1"><code>ExtractEmitTypes</code> <a class="header-anchor" href="#extractemittypes" aria-label="Permalink to &quot;`ExtractEmitTypes`&quot;">​</a></h3><hr><p>Extracts types of a runtime emits declaration.</p><h3 id="extendslots" tabindex="-1"><code>ExtendSlots</code> <a class="header-anchor" href="#extendslots" aria-label="Permalink to &quot;`ExtendSlots`&quot;">​</a></h3><hr><p>Allows you to extend slots of a given slot interface.</p>',52),h=[n];function l(o,r,d,p,k,c){return s(),t("div",null,h)}const g=i(a,[["render",l]]);export{y as __pageData,g as default};
