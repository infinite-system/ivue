import{E as u}from"../pages_guidelines.md.DKQD5ylT.js";import{u as y,a4 as f,I as l,J as m,X as o,z as h,R as v,O as c,N as s,a9 as d,M as _}from"./framework.BdEz2lsW.js";import"./theme.BdLk8B6w.js";import"./index.es.BgmpHtBi.js";const b={key:0,style:{display:"flex","min-width":"fit-content",overflow:"hidden","border-radius":"3px"}},x=["src"],g={class:"col q-ml-sm"},q={class:"bl-project-layout-option__name"},w={class:"text-condensed row wrap q-gutter-x-sm",style:{"font-size":"12px","padding-left":"4px",color:"rgb(76, 86, 105)"}},j=y({__name:"LayoutOption",props:{opt:{},index:{},modelValue:{},mode:{},params:{},component:{type:[Object,Function,Boolean]},scope:{},commaSeparated:{type:Boolean},itemClass:{},itemProps:{},clickable:{type:Boolean}},setup(k){return(e,z)=>{var a,n,i,r,p;const t=f("q-icon");return l(),m("div",{class:c(["bl-project-layout-option no-wrap row q-py-xs items-center",["selected-item-chip","selected-item"].includes(e.mode)?"q-pr-xs":"q-px-xs"])},[(i=(n=(a=e.opt)==null?void 0:a.floorplan_media)==null?void 0:n[0])!=null&&i.key?(l(),m("div",b,[o("img",{src:`${h(u).server}/media/file/${e.opt.floorplan_media[0].key}`,class:"bl-project-layout-option__image"},null,8,x)])):v("",!0),o("div",g,[o("div",{class:c(["q-gutter-x-xs items-center display-block",(r=e.params)!=null&&r.fetchEntity&&["view","list"].includes(e.mode)?"text-primary":"text-grey-10"])},[o("div",q,s((p=e.opt)==null?void 0:p.name),1),o("div",w,[o("span",null,[d(t,{size:"12px",name:"sym_o_bed"}),_(" "+s(e.opt.bedrooms),1)]),o("span",null,[d(t,{size:"12px",name:"sym_o_shower"}),_(" "+s(e.opt.bathrooms),1)]),o("span",null,s(e.opt.interior_size?e.opt.interior_size+" sf":""),1)])],2)])],2)}}});export{j as default};
