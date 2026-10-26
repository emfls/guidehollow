// Markdown task lists render disabled inputs without a native label.
export default {
  name: 'label-task-checkboxes',
  element: {
    filter: ['input'],
    visit(node, ctx) {
      if (node.properties.type === 'checkbox') {
        ctx.setProperty(node, 'ariaLabel', ctx.textContent(ctx.parent(node)).trim());
      }
    },
  },
};
