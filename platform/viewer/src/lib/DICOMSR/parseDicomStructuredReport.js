import * as dcmjs from 'dcmjs';
import getInstanceMetadata from './utils/getInstanceMetadata';

/**
 * Function to parse the part10 array buffer that comes from a DICOM Structured report into measurementData
 * measurementData format is a viewer specific format to be stored into the redux and consumed by other components
 * (e.g. measurement table)
 *
 * @param {ArrayBuffer} part10SRArrayBuffer
 * @param {Array} displaySets
 * @returns
 */
const parseDicomStructuredReport = (part10SRArrayBuffer, displaySets) => {
  // Get the dicom data as an Object
  const dicomData = dcmjs.data.DicomMessage.readFile(part10SRArrayBuffer);
  const dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(
    dicomData.dict
  );

  const { MeasurementReport } = dcmjs.adapters.Cornerstone;
  const storedMeasurementByToolType = MeasurementReport.generateToolState(
    dataset
  );
  const measurementData = {};
  let measurementNumber = 0;

  Object.keys(storedMeasurementByToolType).forEach(toolType => {
    const measurements = storedMeasurementByToolType[toolType];
    measurementData[toolType] = [];

    measurements.forEach(measurement => {
      const instanceMetadata = getInstanceMetadata(
        displaySets,
        measurement.sopInstanceUid
      );
      const { _study: study, _series: series } = instanceMetadata;
      const { studyInstanceUid, patientId } = study;
      const { seriesInstanceUid } = series;
      const { sopInstanceUid, frameIndex } = measurement;
      const imagePath = getImagePath(studyInstanceUid, seriesInstanceUid, sopInstanceUid, frameIndex);

      const imageId = instanceMetadata.getImageId();
      if (!imageId) {
        return;
      }

      // TODO: We need the currentTimepointID set into the viewer
      const currentTimepointId = 'TimepointId';

      const toolData = Object.assign({}, measurement, {
        imageId,
        imagePath,
        seriesInstanceUid,
        studyInstanceUid,
        patientId,
        measurementNumber: ++measurementNumber,
        timepointId: currentTimepointId,
        toolType,
        _id: imageId + measurementNumber,
      });

      measurementData[toolType].push(toolData);
    });
  });

  return measurementData;
};

const getImagePath = (studyInstanceUid, seriesInstanceUid, sopInstanceUid, frameIndex) => {
  return [studyInstanceUid, seriesInstanceUid, sopInstanceUid, frameIndex].join('_');
}

export default parseDicomStructuredReport;
