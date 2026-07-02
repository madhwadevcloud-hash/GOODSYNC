const fs = require('fs');
const path = 'd:/ss_infinite_projects/GOODSYNC/frontend/src/components/SimpleIDCardGenerator.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add imports
if (!code.includes("import JSZip")) {
  code = code.replace("import axios from 'axios';", "import axios from 'axios';\nimport JSZip from 'jszip';\nimport html2canvas from 'html2canvas';\nimport { createRoot } from 'react-dom/client';");
}

// 2. Add state variables for previewStudent and previewSide
if (!code.includes("const [previewStudent")) {
  code = code.replace("const [showPreview, setShowPreview] = useState(false);", "const [showPreview, setShowPreview] = useState(false);\n  const [previewStudent, setPreviewStudent] = useState<any>(null);\n  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');");
}

// 3. Replace handleGenerate
const handleGenerateOld = code.substring(code.indexOf("const handleGenerate = async () => {"), code.indexOf("const handleDownloadBulk = async () => {"));
const handleGenerateNew = `const handleGenerate = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    
    setGenerating(true);
    setTimeout(() => {
      const generated = selectedStudents.map(student => ({
        studentId: student._id || student.id,
        studentName: student.name,
        status: 'success'
      }));
      setGeneratedCards(generated);
      setShowResults(true);
      setOrientationLocked(true);
      setGenerating(false);
      toast.success('ID Cards ready for preview/download');
    }, 500);
  };

  `;
code = code.replace(handleGenerateOld, handleGenerateNew);

// 4. Replace handleDownloadBulk
const handleDownloadBulkOld = code.substring(code.indexOf("const handleDownloadBulk = async () => {"), code.indexOf("const handleDownloadIndividual = async (student: any) => {"));
const handleDownloadBulkNew = `const handleDownloadBulk = async () => {
    try {
      setDownloading(true);
      toast.loading('Generating ZIP file... This may take a moment.', { id: 'zip-download' });
      
      const zip = new JSZip();
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      const root = createRoot(container);
      
      for (let i = 0; i < selectedStudents.length; i++) {
        const student = selectedStudents[i];
        const folderName = student.sequenceId || student.rollNumber || \`student_\${i + 1}\`;
        const studentFolder = zip.folder(folderName);
        if (!studentFolder) continue;
        
        await new Promise<void>(resolve => {
          root.render(<NewIDCardTemplate settings={templateSettings} student={student} templateId={orientation} side="front" theme={theme} />);
          setTimeout(resolve, 800);
        });
        const frontCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
        studentFolder.file(\`\${folderName}_front.png\`, frontCanvas.toDataURL('image/png').split(',')[1], { base64: true });
        
        if (includeBack) {
          await new Promise<void>(resolve => {
            root.render(<NewIDCardTemplate settings={templateSettings} student={student} templateId={orientation} side="back" theme={theme} />);
            setTimeout(resolve, 800);
          });
          const backCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
          studentFolder.file(\`\${folderName}_back.png\`, backCanvas.toDataURL('image/png').split(',')[1], { base64: true });
        }
      }
      
      root.unmount();
      document.body.removeChild(container);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', \`IDCards_Bulk_\${Date.now()}.zip\`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss('zip-download');
      toast.success(\`ID cards downloaded successfully\`);
    } catch (error) {
      console.error('Error downloading ID cards:', error);
      toast.dismiss('zip-download');
      toast.error('Failed to download ID cards');
    } finally {
      setDownloading(false);
    }
  };

  `;
code = code.replace(handleDownloadBulkOld, handleDownloadBulkNew);

// 5. Replace handleDownloadIndividual
const handleDownloadIndOld = code.substring(code.indexOf("const handleDownloadIndividual = async (student: any) => {"), code.indexOf("const handlePreview = async (studentId: string, side: 'front' | 'back' = 'front') => {"));
const handleDownloadIndNew = `const handleDownloadIndividual = async (student: any) => {
    try {
      toast.loading(\`Generating ID card for \${student.name}...\`, { id: 'ind-download' });
      
      const zip = new JSZip();
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      const root = createRoot(container);
      
      const folderName = student.sequenceId || student.rollNumber || \`student\`;
      
      await new Promise<void>(resolve => {
        root.render(<NewIDCardTemplate settings={templateSettings} student={student} templateId={orientation} side="front" theme={theme} />);
        setTimeout(resolve, 800);
      });
      const frontCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
      zip.file(\`\${folderName}_front.png\`, frontCanvas.toDataURL('image/png').split(',')[1], { base64: true });
      
      if (includeBack) {
        await new Promise<void>(resolve => {
          root.render(<NewIDCardTemplate settings={templateSettings} student={student} templateId={orientation} side="back" theme={theme} />);
          setTimeout(resolve, 800);
        });
        const backCanvas = await html2canvas(container.firstChild as HTMLElement, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: null });
        zip.file(\`\${folderName}_back.png\`, backCanvas.toDataURL('image/png').split(',')[1], { base64: true });
      }
      
      root.unmount();
      document.body.removeChild(container);
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', \`IDCard_\${student.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip\`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss('ind-download');
      toast.success(\`ID card downloaded for \${student.name}\`);
    } catch (error) {
      console.error('Error downloading individual ID card:', error);
      toast.dismiss('ind-download');
      toast.error('Failed to download individual ID card');
    }
  };

  `;
code = code.replace(handleDownloadIndOld, handleDownloadIndNew);

// 6. Replace handlePreview
const handlePreviewOld = code.substring(code.indexOf("const handlePreview = async (studentId: string, side: 'front' | 'back' = 'front') => {"), code.indexOf("return (", code.indexOf("const handlePreview")));
const handlePreviewNew = `const handlePreview = async (studentId: string, side: 'front' | 'back' = 'front') => {
    const student = selectedStudents.find(s => (s._id || s.id) === studentId);
    if (student) {
      setPreviewStudent(student);
      setPreviewSide(side);
      setShowPreview(true);
    }
  };

  `;
code = code.replace(handlePreviewOld, handlePreviewNew);

// 7. Replace Preview Modal
const previewModalOldRegex = /\{\/\* Preview Modal \*\/\}(.|\n)*?\<\/\>/;
const previewModalNew = `{/* Preview Modal */}
      {showPreview && previewStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className={\`bg-white rounded-lg w-full overflow-auto \${orientation === 'portrait' ? 'max-w-2xl max-h-[95vh]' : 'max-w-5xl max-h-[90vh]'}\`}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                ID Card Preview ({orientation === 'portrait' ? 'Portrait' : 'Landscape'}) - {previewSide === 'front' ? 'Front' : 'Back'}
              </h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewStudent(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex justify-center bg-gray-50">
              <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
                <NewIDCardTemplate 
                  settings={templateSettings} 
                  student={previewStudent as any} 
                  templateId={orientation} 
                  side={previewSide} 
                  theme={theme} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>`;
code = code.replace(previewModalOldRegex, previewModalNew);

fs.writeFileSync(path, code);
console.log('Successfully updated SimpleIDCardGenerator.tsx');
