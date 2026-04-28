import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getUniqueBatchNames, 
  getSectionsForBatch, 
  getElectivesForBatch,
  type Course
} from '../utils/dataParser';
import { useTheme } from '../context/ThemeContext';

const Onboarding: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<string[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [availableElectives, setAvailableElectives] = useState<Course[]>([]);
  const [selectedElectiveCodes, setSelectedElectiveCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (localStorage.getItem('user-batch') && localStorage.getItem('user-section')) {
      navigate('/timetable', { replace: true });
    }
    setBatches(getUniqueBatchNames());
  }, [navigate]);

  useEffect(() => {
    if (selectedBatch) {
      setAvailableSections(getSectionsForBatch(selectedBatch));
      setSelectedSection('');
      setAvailableElectives([]);
      setSelectedElectiveCodes(new Set());
    } else {
      setAvailableSections([]);
    }
  }, [selectedBatch]);

  useEffect(() => {
    if (selectedBatch && selectedSection) {
      // Get ALL electives for the batch regardless of section
      const electives = getElectivesForBatch(selectedBatch);
      setAvailableElectives(electives);
      setSelectedElectiveCodes(new Set());
    } else {
      setAvailableElectives([]);
    }
  }, [selectedBatch, selectedSection]);

  const toggleElective = (code: string) => {
    const newSet = new Set(selectedElectiveCodes);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedElectiveCodes(newSet);
  };

  const handleContinue = () => {
    if (selectedBatch && selectedSection) {
      localStorage.setItem('user-batch', selectedBatch);
      localStorage.setItem('user-section', selectedSection);
      localStorage.setItem('user-electives', JSON.stringify(Array.from(selectedElectiveCodes)));
      navigate('/timetable');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-6 bg-surface-container-low dark:bg-gray-950 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <button 
          onClick={toggleTheme}
          className="material-symbols-outlined text-primary dark:text-primary-fixed-dim p-2 hover:bg-surface-container dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          {theme === 'light' ? 'dark_mode' : 'light_mode'}
        </button>
      </div>
      <div className="w-full max-w-lg glass-card p-8 rounded-2xl">
        <div className="text-center mb-8">
          <h1 className="text-headline-lg text-primary dark:text-primary-fixed-dim font-black mb-2 tracking-tight">BNU SCIT Timetable</h1>
          <p className="text-body-md text-secondary dark:text-gray-400">Select your academic details to configure your dashboard.</p>
        </div>

        
        <div className="space-y-6">
          <div>
            <label className="block text-label-md text-on-surface dark:text-gray-200 font-bold uppercase mb-2" htmlFor="batch">Batch / Program</label>
            <select 
              id="batch" 
              value={selectedBatch} 
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full p-3 rounded-lg border border-outline-variant dark:border-gray-700 bg-surface-container-lowest dark:bg-gray-800 text-on-surface dark:text-gray-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed"
            >
              <option value="">-- Select Batch --</option>
              {batches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {selectedBatch && availableSections.length > 0 && (
            <div className="animate-fade-in">
              <label className="block text-label-md text-on-surface dark:text-gray-200 font-bold uppercase mb-2" htmlFor="section">Section</label>
              <select 
                id="section" 
                value={selectedSection} 
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full p-3 rounded-lg border border-outline-variant dark:border-gray-700 bg-surface-container-lowest dark:bg-gray-800 text-on-surface dark:text-gray-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-fixed"
              >
                <option value="">-- Select Section --</option>
                {availableSections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
          )}

          {selectedSection && availableElectives.length > 0 && (
            <div className="animate-fade-in border-t border-outline-variant dark:border-gray-800 pt-6 mt-6">
              <label className="block text-label-md text-primary dark:text-primary-fixed-dim font-bold uppercase mb-3">
                Select Your Electives
              </label>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {availableElectives.map(elective => (
                  <label key={elective.course_code} className="flex items-start gap-3 p-3 rounded-xl border border-outline-variant dark:border-gray-700 hover:border-primary dark:hover:border-primary-fixed-dim cursor-pointer transition-all hover:scale-[1.02] bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                    <div className="flex items-center h-5 mt-0.5">

                      <input 
                        type="checkbox" 
                        checked={selectedElectiveCodes.has(elective.course_code)}
                        onChange={() => toggleElective(elective.course_code)}
                        className="w-4 h-4 text-primary bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary focus:ring-2"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-body-md font-semibold text-on-surface dark:text-gray-100">{elective.course_name}</span>
                      <span className="text-label-sm text-secondary dark:text-gray-400">{elective.course_code} • {elective.faculty}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button 
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all mt-8 ${
              selectedBatch && selectedSection 
                ? 'bg-primary text-on-primary hover:bg-primary-container shadow-md' 
                : 'bg-surface-variant dark:bg-gray-800 text-on-surface-variant dark:text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleContinue}
            disabled={!selectedBatch || !selectedSection}
          >
            Launch Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
