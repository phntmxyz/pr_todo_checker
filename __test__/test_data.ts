import { PrDiff } from '../src/types'

export const mixedTodoDiff: PrDiff = [
  {
    sha: '111111111',
    filename: 'README.md',
    status: 'modified',
    additions: 3,
    deletions: 1,
    changes: 4,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -26,4 +26,6 @@ TODO:
 First line
 - [Tool_A](https://example.com)
 - [Tool_B](https://example.com)
-- [Tool_C](https://example.net)
+- [Tool_C](https://example.com)
+
+- // TODO here`
  },
  {
    sha: '111111111',
    filename: 'lib/first.js',
    status: 'modified',
    additions: 0,
    deletions: 1,
    changes: 1,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -19,7 +19,6 @@ import 'file';
 const instance: ClassA = new ClassA()
 
-// TODO removed comment
 const instance: ClassB = new ClassB()
 
 class ClassB extends ClassA {`
  },
  {
    sha: '111111111',
    filename: 'lib/second.js',
    status: 'modified',
    additions: 11,
    deletions: 0,
    changes: 11,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -22,6 +22,14 @@ import 'file';
 
 import 'file';
 
+// comment
+//       TODO - upper case with much space
+// todo - lower case with space
+//todo - lower case no space
+
+// also a todo comment
+// comment
+/*
+ * todo - In comment block
+ */
+
 function print({
     parameter: string,
     parameter: string,`
  }
]

export const updateTodoDiff: PrDiff = [
  {
    sha: '111111111',
    filename: 'README.md',
    status: 'modified',
    additions: 3,
    deletions: 1,
    changes: 4,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -26,4 +26,6 @@ TODO:
 First line
 - [Tool_A](https://example.com)
 - [Tool_B](https://example.com)
-- // todo remved
+- // todo updated`
  }
]

export const newFileTodoDiff: PrDiff = [
  {
    sha: '111111111',
    filename: 'first.js',
    status: 'added',
    additions: 27,
    deletions: 0,
    changes: 0,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -0,0 +1,27 @@
+// import second.js
+
+// TODO first todo
+// TODO second todo
+// TODO third todo
+// TODO fourth todo
+// Dummy class A
+class A {
+  constructor() {
+    this.propertyA = 'Value A';
+  }
+
+  methodA() {
+    // TODO: Implement methodA
+  }
+}
+
+// Dummy class B
+class B {
+  constructor() {
+    this.propertyB = 'Value B';
+  }
+
+  methodB() {
+    // TODO: Implement methodB
+  }
+}`
  }
]

export const startWithRemovedLineTodoDiff: PrDiff = [
  {
    sha: '111111111',
    filename: 'first.js',
    status: 'added',
    additions: 27,
    deletions: 0,
    changes: 0,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -2,0 +8,27 @@
 // import second.js
-
-// TODO first todo
-// TODO second todo
-// TODO third todo
-// TODO fourth todo
-// Dummy class A
 class A {
   constructor() {
     this.propertyA = 'Value A';
   }
 
   methodA() {
+    // TODO: Implement methodA
   }
 }
 
 // Dummy class B
-class B {
-  constructor() {
-    this.propertyB = 'Value B';
-  }
-
-  methodB() {
-    // TODO: Implement methodB
-  }
-}`
  }
]

export const excludeFilesDiff: PrDiff = [
  {
    sha: 'sha',
    filename: 'filename.js',
    status: 'modified',
    additions: 1,
    deletions: 0,
    changes: 0,
    blob_url: 'blob_url',
    raw_url: 'raw_url',
    contents_url: 'contents_url',
    patch: `@@ -0,0 +22,14 @@ any text';
+ // TODO - in filename js`,
    previous_filename: undefined
  },
  {
    sha: 'sha',
    filename: 'filename.yml',
    status: 'modified',
    additions: 1,
    deletions: 0,
    changes: 0,
    blob_url: 'blob_url',
    raw_url: 'raw_url',
    contents_url: 'contents_url',
    patch: `@@ -0,0 +22,14 @@ any text';
+ // TODO - in filename yml`,
    previous_filename: undefined
  },
  {
    sha: 'sha',
    filename: 'excluded/filename.js',
    status: 'modified',
    additions: 1,
    deletions: 0,
    changes: 0,
    blob_url: 'blob_url',
    raw_url: 'raw_url',
    contents_url: 'contents_url',
    patch: `@@ -0,0 +22,14 @@ any text';
+ // TODO - in excluded directory`,
    previous_filename: undefined
  },
  {
    sha: 'sha',
    filename: 'included/other.txt',
    status: 'modified',
    additions: 1,
    deletions: 0,
    changes: 0,
    blob_url: 'blob_url',
    raw_url: 'raw_url',
    contents_url: 'contents_url',
    patch: `@@ -0,0 +22,14 @@ any text';
+ // TODO - in included directory`,
    previous_filename: undefined
  }
]

export const htmlTodoDiff: PrDiff = [
  {
    sha: '111111111',
    filename: 'first.html',
    status: 'modified',
    additions: 2,
    deletions: 0,
    changes: 1,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -2,0 +1,27 @@
 <html>
+  <!-- TODO first todo -->
   <body>
-     <!-- TODO second todo -->
+     <!-- TODO third todo -->
+     <!-- TODO fourth todo -->
      <h1>My First Heading</h1>
      <p>My first paragraph.</p>
   </body>`
  }
]

export const mixedTodoMatcherDiff: PrDiff = [
  {
    sha: '111111111',
    filename: 'first.any',
    status: 'modified',
    additions: 2,
    deletions: 0,
    changes: 1,
    blob_url: '',
    raw_url: '',
    contents_url: '',
    patch: `@@ -0,0 +1,27 @@
+  <!-- TODO first todo -->
+ / todo no todo
+ // todo second todo
+ # todo third todo
+ -- todo fourth todo
+ ; todo fifth todo
+ // fixme sixth todo`
  }
]
