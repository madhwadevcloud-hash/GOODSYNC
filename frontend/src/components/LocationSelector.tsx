import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import locationAPI, { State, District, Taluka } from '../services/locationAPI';

interface LocationSelectorProps {
  selectedState?: number | string;
  selectedDistrict?: number | string;
  selectedTaluka?: number | string;
  // districtText and talukaText props are no longer needed for dropdowns,
  // but kept for compatibility if the parent component still tracks them.
  districtText?: string;
  talukaText?: string;
  onStateChange?: (stateId: number, state: State) => void;
  onDistrictChange?: (districtId: number, district: District) => void;
  onTalukaChange?: (talukaId: number, taluka: Taluka) => void;
  onDistrictTextChange?: (text: string) => void; // Kept for interface compatibility
  onTalukaTextChange?: (text: string) => void; // Kept for interface compatibility
  disabled?: boolean;
  required?: boolean;
  showTaluka?: boolean;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedState,
  selectedDistrict,
  selectedTaluka,
  // districtText, // Not used in the new dropdown logic
  // talukaText, // Not used in the new dropdown logic
  onStateChange,
  onDistrictChange,
  onTalukaChange,
  onDistrictTextChange, // Not used in the new dropdown logic
  onTalukaTextChange, // Not used in the new dropdown logic
  disabled = false,
  required = false,
  showTaluka = true,
  className = ""
}) => {
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [talukas, setTalukas] = useState<Taluka[]>([]);
  const [loading, setLoading] = useState({
    states: false,
    districts: false,
    talukas: false
  });

  // Load states on component mount
  useEffect(() => {
    const loadStates = async () => {
      setLoading(prev => ({ ...prev, states: true }));
      try {
        const statesData = await locationAPI.getStates();
        setStates(statesData);
      } catch (error) {
        console.error('Error loading states:', error);
      } finally {
        setLoading(prev => ({ ...prev, states: false }));
      }
    };
    loadStates();
  }, []);

  // Load districts when state changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedState) {
        setDistricts([]);
        setTalukas([]);
        return;
      }

      setLoading(prev => ({ ...prev, districts: true }));
      try {
        // Handle both number and string types for selectedState
        const stateId = typeof selectedState === 'string' ? parseInt(selectedState) : selectedState;
        const districtsData = await locationAPI.getDistrictsByState(stateId);
        setDistricts(districtsData);
        setTalukas([]); // Clear talukas when state changes
      } catch (error) {
        console.error('Error loading districts:', error);
      } finally {
        setLoading(prev => ({ ...prev, districts: false }));
      }
    };
    loadDistricts();
  }, [selectedState]);

  // Load talukas when district changes
  useEffect(() => {
    const loadTalukas = async () => {
      if (!selectedDistrict || !showTaluka) {
        setTalukas([]);
        return;
      }

      setLoading(prev => ({ ...prev, talukas: true }));
      try {
        // Handle both number and string types for selectedDistrict
        const districtId = typeof selectedDistrict === 'string' ? parseInt(selectedDistrict) : selectedDistrict;
        const talukasData = await locationAPI.getTalukasByDistrict(districtId);
        setTalukas(talukasData);
      } catch (error) {
        console.error('Error loading talukas:', error);
      } finally {
        setLoading(prev => ({ ...prev, talukas: false }));
      }
    };
    loadTalukas();
  }, [selectedDistrict, showTaluka]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stateId = parseInt(e.target.value);
    const state = states.find(s => s.id === stateId);
    if (state && onStateChange) {
      onStateChange(stateId, state);
    }
    // Note: Parent component is responsible for clearing selectedDistrict/Taluka
    // when state changes, by passing 'undefined' or a new state ID.
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtId = parseInt(e.target.value);
    const district = districts.find(d => d.id === districtId);
    if (district && onDistrictChange) {
      onDistrictChange(districtId, district);
    }
    // Note: Parent component is responsible for clearing selectedTaluka
    // when district changes.
  };

  const handleTalukaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const talukaId = parseInt(e.target.value);
    const taluka = talukas.find(t => t.id === talukaId);
    if (taluka && onTalukaChange) {
      onTalukaChange(talukaId, taluka);
    }
  };

  const selectClassName = `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`;

  // The inputClassName is no longer strictly necessary but kept for variable cleanliness
  // const inputClassName = `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`;

  // Removed the isKarnatakaSelected check
  // console.log('LocationSelector - selectedState:', selectedState, 'districts:', districts.length, 'talukas:', talukas.length);

  return (
    <div className={className || 'space-y-4'}>
      {/* State Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          State {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={selectedState || ''}
            onChange={handleStateChange}
            disabled={disabled || loading.states}
            required={required}
            className={selectClassName}
          >
            <option value="">
              {loading.states ? 'Loading states...' : 'Select State'}
            </option>
            {states.map(state => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* District Dropdown (Dropdown for ALL states now) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          District {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            value={selectedDistrict || ''}
            onChange={handleDistrictChange}
            disabled={disabled || loading.districts || !selectedState}
            required={required}
            className={selectClassName}
          >
            <option value="">
              {loading.districts
                ? 'Loading districts...'
                : !selectedState
                  ? 'Select state first'
                  : districts.length === 0
                    ? 'No districts found' // Added case for no districts
                    : 'Select District'
              }
            </option>
            {districts.map(district => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Taluka Dropdown (Dropdown for ALL states now, if showTaluka is true) */}
      {showTaluka && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Taluka/Taluk {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select
              value={selectedTaluka || ''}
              onChange={handleTalukaChange}
              disabled={disabled || loading.talukas || !selectedDistrict}
              required={required}
              className={selectClassName}
            >
              <option value="">
                {loading.talukas
                  ? 'Loading talukas...'
                  : !selectedDistrict
                    ? 'Select district first'
                    : talukas.length === 0
                      ? 'No talukas found' // Added case for no talukas
                      : 'Select Taluka'
                }
              </option>
              {talukas.map(taluka => (
                <option key={taluka.id} value={taluka.id}>
                  {taluka.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;