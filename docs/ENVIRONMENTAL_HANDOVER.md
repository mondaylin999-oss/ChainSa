# Environmental chart and insight integration

Merged the graph and analysis components from Earthbeat_Environmental_Module_Final_Handover.zip into src/features/environmental.

The standalone dashboard build transpiles these components against its existing React runtime. The host adapts live NASA POWER observations to the handover DataSeries contract. Graph selection, keyboard control, synchronized sound, volume, speed, and looping playback use the existing EARTHBEAT engine.

Integration corrections:
- Chart domains support the actual measurement range rather than clamping every indicator to NDVI limits.
- Dates retain their elapsed-time spacing; sound selection uses the same date domain.
- The descriptive regression reference is centered on the mean.
- Source details identify NASA POWER for current observations.
- Layout adapts to the narrow scrolling dashboard inspector.

This merge does not activate MODIS retrieval: the handover requires an authenticated Earth Engine backend for that data. Statistics remain descriptive; no significance test or forecast is claimed.
