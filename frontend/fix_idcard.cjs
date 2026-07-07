const fs = require('fs');
const path = 'd:/ss_infinite_projects/GOODSYNC/frontend/src/components/SimpleIDCardGenerator.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add missing imports
if (!code.includes("import { useTemplateData }")) {
  code = code.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useTemplateData } from './templates/hooks/useTemplateData';\nimport NewIDCardTemplate from './templates/NewIDCardTemplate';");
}

// Add theme to interface
if (!code.includes("theme?: 'modern' | 'classic' | 'minimalist';")) {
  code = code.replace("lockOrientation?: boolean;", "lockOrientation?: boolean;\n  theme?: 'modern' | 'classic' | 'minimalist';");
}

// Add theme to props
if (code.includes("lockOrientation = false,\n})")) {
  code = code.replace("lockOrientation = false,\n})", "lockOrientation = false,\n  theme = 'modern'\n})");
} else if (code.includes("lockOrientation = false\n})")) {
  code = code.replace("lockOrientation = false\n})", "lockOrientation = false,\n  theme = 'modern'\n})");
} else if (!code.includes("theme = 'modern'")) {
  code = code.replace("lockOrientation = false", "lockOrientation = false,\n  theme = 'modern'");
}

// Add templateSettings hook
if (!code.includes("const { templateSettings } = useTemplateData();")) {
  code = code.replace("const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');", "const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');\n  const { templateSettings } = useTemplateData();");
}

fs.writeFileSync(path, code);
console.log('Successfully fixed typescript errors in SimpleIDCardGenerator.tsx');
