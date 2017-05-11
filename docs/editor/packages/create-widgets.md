---
title: Create Widgets
category: editor
permalinks: editor/packages/create-widgets
---

Widgets are pluggable custom elements that can be shared by panels. Widgets must be created inside a package. A good example of a widgets library is Fireball's builtin [ui-kit](https://github.com/fireball-packages/ui-kit).

## Register Widget

Define a widget in `page-level`, then save it as `simple-widget.html` in your package's `widget` folder.

```html
<dom-module id="simple-widget">
    <style>
        :host {
            color: red;
        }
    </style>

    <template>
        This is a simple widget
    </template>
</dom-module>

<script>
    Editor.registerWidget( 'simple-widget', {
        is: 'simple-widget',
    });
</script>
```
Register the html file in `package.json`:

```json
{
  "name": "simple",
  "widgets": {
    "simple-widget": "widget/simple-widget.html"
  }
}
```

## Reference Widget

Once you register the package in package.json, you can reference the widget with package name as the route path like this:

```js
`packages://{package-name}/widget`
```

For example, suppose you have a `panel.html` in other packages, you can import the widget above like this:

```html
<link rel="import" href="packages://simple/widget/simple-widget.html">
```

Then you can use widget element anywhere in your panel:

```html
<simple-widget></simple-widget>
```
